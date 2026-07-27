from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

from google.cloud import storage, vision

from backend.ai_service import AiService

logger = logging.getLogger("ai_therapist.material_upload")

_BUCKET_NAME = "aitherapist-503618-material-uploads"


def _decode_json(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def upload_row_to_dict(row: Any) -> dict[str, Any]:
    data = dict(row)
    return {
        "id": str(data["id"]),
        "original_filename": data["original_filename"],
        "status": data["status"],
        "ocr_text": data.get("ocr_text"),
        "parsed_definition_json": _decode_json(data.get("parsed_definition_json")),
        "restricted_instrument_match": data.get("restricted_instrument_match"),
        "error_message": data.get("error_message"),
        "catalog_id": str(data["catalog_id"]) if data.get("catalog_id") else None,
        "version_id": str(data["version_id"]) if data.get("version_id") else None,
        "created_at": data["created_at"],
        "updated_at": data["updated_at"],
    }


def _upload_bytes_sync(storage_path: str, content: bytes, content_type: str) -> None:
    client = storage.Client()
    bucket = client.bucket(_BUCKET_NAME)
    blob = bucket.blob(storage_path)
    blob.upload_from_string(content, content_type=content_type)


def _run_ocr_sync(storage_path: str) -> str:
    """Runs Cloud Vision DOCUMENT_TEXT_DETECTION on a GCS-stored PDF/image
    via the async batch API (handles multi-page scanned documents), writing
    results to a GCS output prefix and reading them back."""
    client = vision.ImageAnnotatorClient()
    gcs_source = vision.GcsSource(uri=f"gs://{_BUCKET_NAME}/{storage_path}")
    input_config = vision.InputConfig(gcs_source=gcs_source, mime_type="application/pdf")

    output_prefix = storage_path.rsplit(".", 1)[0] + "_ocr/"
    gcs_destination = vision.GcsDestination(uri=f"gs://{_BUCKET_NAME}/{output_prefix}")
    output_config = vision.OutputConfig(gcs_destination=gcs_destination, batch_size=20)

    feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)
    request = vision.AsyncAnnotateFileRequest(
        features=[feature], input_config=input_config, output_config=output_config,
    )
    operation = client.async_batch_annotate_files(requests=[request])
    operation.result(timeout=300)

    storage_client = storage.Client()
    bucket = storage_client.bucket(_BUCKET_NAME)
    pages_text: list[str] = []
    for blob in bucket.list_blobs(prefix=output_prefix):
        data = json.loads(blob.download_as_bytes())
        for response in data.get("responses", []):
            text = response.get("fullTextAnnotation", {}).get("text", "")
            if text:
                pages_text.append(text)
    return "\n\n".join(pages_text)


async def create_upload(
    db: Any, *, org_id: str, uploaded_by: str, filename: str, content: bytes, content_type: str,
) -> dict[str, Any]:
    upload_id = uuid.uuid4()
    storage_path = f"{org_id}/{upload_id}/{filename}"

    await asyncio.to_thread(_upload_bytes_sync, storage_path, content, content_type)

    await db.execute(
        """
        INSERT INTO material_uploads (id, org_id, uploaded_by, original_filename, storage_path, status)
        VALUES ($1, $2, $3, $4, $5, 'uploaded')
        """,
        upload_id, uuid.UUID(org_id), uuid.UUID(uploaded_by), filename, storage_path,
    )
    row = await db.fetchrow("SELECT * FROM material_uploads WHERE id = $1", upload_id)
    return upload_row_to_dict(row)


async def process_upload(db: Any, *, upload_id: str) -> None:
    """Background task: OCR -> AI structuring -> draft catalog+version rows.
    Never raises -- all failures are recorded on the material_uploads row."""
    upload_uuid = uuid.UUID(upload_id)
    row = await db.fetchrow("SELECT * FROM material_uploads WHERE id = $1", upload_uuid)
    if not row:
        return

    try:
        await db.execute(
            "UPDATE material_uploads SET status='ocr_running', updated_at=NOW() WHERE id=$1", upload_uuid,
        )
        ocr_text = await asyncio.to_thread(_run_ocr_sync, row["storage_path"])
        if not ocr_text.strip():
            await db.execute(
                "UPDATE material_uploads SET status='ocr_failed', error_message=$2, updated_at=NOW() WHERE id=$1",
                upload_uuid, "OCR produced no extractable text -- the document may be blank, unreadable, or an unsupported format.",
            )
            return

        await db.execute(
            "UPDATE material_uploads SET status='parsing', ocr_text=$2, updated_at=NOW() WHERE id=$1",
            upload_uuid, ocr_text,
        )

        ai = AiService()
        structured = await ai.structure_assessment_from_text(ocr_text)

        catalog_id = uuid.uuid4()
        template_key = f"upload_{str(upload_uuid)[:8]}"
        suggested_name = structured.get("suggested_name") or row["original_filename"]
        restricted_match = structured.get("restricted_instrument_match")

        await db.execute(
            """
            INSERT INTO assessment_catalog (
                id, org_id, template_key, name, template_type, license_status,
                description, owner_user_id, created_by
            )
            VALUES ($1, $2, $3, $4, 'SCREENING', 'VERIFY', $5, $6, $6)
            """,
            catalog_id, row["org_id"], template_key, suggested_name,
            f"Digitized from an uploaded document ({row['original_filename']}). Draft -- review before publishing."
            + (f" AI flagged a possible match to a restricted instrument: {restricted_match}." if restricted_match else ""),
            row["uploaded_by"],
        )
        version_id = uuid.uuid4()
        await db.execute(
            """
            INSERT INTO assessment_versions (
                id, catalog_id, version_number, status, name, template_type,
                license_status, definition_json, scoring_rules, interpretation_rules,
                notes, created_by
            )
            VALUES ($1, $2, 1, 'draft', $3, 'SCREENING', 'VERIFY', $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
            """,
            version_id, catalog_id, suggested_name,
            json.dumps(structured.get("definition_json") or {}),
            json.dumps(structured["scoring_rules"]) if structured.get("scoring_rules") else None,
            json.dumps(structured["interpretation_rules"]) if structured.get("interpretation_rules") else None,
            structured.get("low_confidence_notes"),
            row["uploaded_by"],
        )

        await db.execute(
            """
            UPDATE material_uploads
            SET status='ready_for_review', parsed_definition_json=$2::jsonb,
                restricted_instrument_match=$3, catalog_id=$4, version_id=$5, updated_at=NOW()
            WHERE id=$1
            """,
            upload_uuid, json.dumps(structured.get("definition_json") or {}),
            restricted_match, catalog_id, version_id,
        )
    except Exception as exc:  # noqa: BLE001 -- background task must never crash silently
        logger.exception("material upload processing failed for %s", upload_id)
        await db.execute(
            "UPDATE material_uploads SET status='parse_failed', error_message=$2, updated_at=NOW() WHERE id=$1",
            upload_uuid, str(exc)[:2000],
        )
