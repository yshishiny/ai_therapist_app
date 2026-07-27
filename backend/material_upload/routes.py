from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from backend.auth import Role, TokenPayload, require_role
from backend.core.dependencies_access import DB
from backend.material_upload.schemas import MaterialUploadOut
from backend.material_upload.service import create_upload, process_upload, upload_row_to_dict

UploadManager = Annotated[TokenPayload, require_role(Role.ADMIN)]

router = APIRouter(tags=["material-upload"])

_ALLOWED_CONTENT_TYPES = {"application/pdf", "image/png", "image/jpeg"}
_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@router.post(
    "/admin/material-uploads",
    response_model=MaterialUploadOut,
    status_code=201,
)
async def upload_material(
    background_tasks: BackgroundTasks,
    user: UploadManager,
    db: DB,
    file: UploadFile = File(...),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Upload a PDF, PNG, or JPEG.")

    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (25MB limit).")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file.")

    result = await create_upload(
        db,
        org_id=user.org_id,
        uploaded_by=user.sub,
        filename=file.filename or "upload",
        content=content,
        content_type=file.content_type,
    )
    background_tasks.add_task(process_upload, db, upload_id=result["id"])
    return result


@router.get("/admin/material-uploads", response_model=list[MaterialUploadOut])
async def list_material_uploads(user: UploadManager, db: DB):
    rows = await db.fetch(
        "SELECT * FROM material_uploads WHERE org_id = $1 ORDER BY created_at DESC",
        uuid.UUID(user.org_id),
    )
    return [upload_row_to_dict(row) for row in rows]


@router.get("/admin/material-uploads/{upload_id}", response_model=MaterialUploadOut)
async def get_material_upload(upload_id: str, user: UploadManager, db: DB):
    row = await db.fetchrow(
        "SELECT * FROM material_uploads WHERE id = $1 AND org_id = $2",
        uuid.UUID(upload_id),
        uuid.UUID(user.org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Upload not found.")
    return upload_row_to_dict(row)
