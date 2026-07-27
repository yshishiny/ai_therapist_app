import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_clinician_service,
    get_patient_service,
)
from backend.src.schemas.patients import (
    PatientBulkUploadSummaryOut,
    PatientCreateIn,
    PatientOut,
    PatientUpdateIn,
)
from backend.src.services.clinician_service_db import ClinicianServiceDb
from backend.src.services.patient_service_db import PatientServiceDb

router = APIRouter(prefix='/patients', tags=['patients'])

BULK_TEMPLATE_COLUMNS = [
    'full_name', 'gender', 'dob', 'diagnosis', 'risk', 'status', 'phone', 'email', 'therapist_email',
]
_BULK_TEMPLATE_EXAMPLE_ROWS = [
    ['Example Patient One', 'Female', '1990-01-15', 'Generalized Anxiety', 'Low', 'Active',
     '+1-555-0100', 'patient.one@example.com', ''],
    ['Example Patient Two', 'Male', '1985-06-30', 'Adjustment Disorder', 'Med', 'Intake',
     '+1-555-0101', 'patient.two@example.com', 'clinician@example.com'],
]
BULK_UPLOAD_MAX_ROWS = 200


@router.get('', response_model=list[PatientOut])
async def list_patients(
    limit: int = 50,
    offset: int = 0,
    mine: bool = False,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('patients.view'),
    service: PatientServiceDb = Depends(get_patient_service),
):
    therapist_id = context.user_id if mine else None
    return await service.list_patients(
        org_id=context.org_id, limit=limit, offset=offset, therapist_id=therapist_id
    )


# NOTE: the bulk routes are declared BEFORE GET '/{patient_id}' on purpose --
# otherwise FastAPI would match 'bulk-template' as a patient_id.
@router.get('/bulk-template')
async def download_bulk_template(
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('patients.manage'),
):
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator='\r\n')
    writer.writerow(BULK_TEMPLATE_COLUMNS)
    for example_row in _BULK_TEMPLATE_EXAMPLE_ROWS:
        writer.writerow(example_row)
    return Response(
        content=buffer.getvalue(),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="patients_template.csv"'},
    )


def _clean_cell(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_row(raw_row: dict) -> dict:
    return {
        str(key).strip().lower(): _clean_cell(value)
        for key, value in raw_row.items()
        if key is not None
    }


def _parse_bulk_rows(filename: str, content_type: str | None, raw: bytes) -> list:
    """Return the list of raw data rows (dicts for CSV; anything for JSON --
    non-dict entries become per-row errors later). Raises HTTPException for
    file-level problems."""
    name = (filename or '').lower()
    is_csv = name.endswith('.csv') or content_type in ('text/csv', 'application/csv')
    is_json = name.endswith('.json') or content_type in ('application/json', 'text/json')
    if not is_csv and not is_json:
        raise HTTPException(status_code=400, detail='Upload a .csv or .json file.')

    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail='The file is not valid UTF-8 text.') from exc

    if is_csv:
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            raise HTTPException(status_code=400, detail='The CSV file is empty.')
        header = [str(f).strip().lower() for f in reader.fieldnames if f]
        if 'full_name' not in header:
            raise HTTPException(
                status_code=400,
                detail="The CSV header does not match the template (missing 'full_name' column). "
                       'Download the template from GET /patients/bulk-template.',
            )
        return list(reader)

    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f'Not valid JSON: {exc}') from exc
    if not isinstance(payload, list):
        raise HTTPException(
            status_code=400,
            detail='The JSON file must contain an array of patient objects.',
        )
    return payload


@router.post('/bulk-upload', response_model=PatientBulkUploadSummaryOut)
async def bulk_upload_patients(
    file: UploadFile = File(...),
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('patients.manage'),
    service: PatientServiceDb = Depends(get_patient_service),
):
    raw = await file.read()
    rows = _parse_bulk_rows(file.filename or '', file.content_type, raw)

    if not rows:
        raise HTTPException(status_code=400, detail='No data rows found in the file.')
    if len(rows) > BULK_UPLOAD_MAX_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f'Too many rows ({len(rows)}). '
                   f'The limit is {BULK_UPLOAD_MAX_ROWS} patients per upload.',
        )

    created = 0
    errors: list[dict] = []
    email_cache: dict[str, str | None] = {}

    # Row numbers match the source file: header = row 1, first data row = 2.
    for row_number, raw_row in enumerate(rows, start=2):
        if not isinstance(raw_row, dict):
            errors.append({'row': row_number, 'error': 'Row must be an object of patient fields.'})
            continue
        row = _normalize_row(raw_row)

        if not row.get('full_name'):
            errors.append({'row': row_number, 'error': 'full_name is required.'})
            continue

        dob = row.get('dob')
        if dob is not None:
            try:
                datetime.strptime(dob, '%Y-%m-%d')
            except ValueError:
                errors.append({'row': row_number, 'error': f"dob '{dob}' must be in YYYY-MM-DD format."})
                continue

        therapist_email = row.get('therapist_email')
        if therapist_email is not None:
            cache_key = therapist_email.lower()
            if cache_key not in email_cache:
                email_cache[cache_key] = await service.find_clinician_id_by_email(
                    email=therapist_email, org_id=context.org_id
                )
            therapist_id = email_cache[cache_key]
            if therapist_id is None:
                errors.append({
                    'row': row_number,
                    'error': f"No clinician with email '{therapist_email}' was found in this practice.",
                })
                continue
        else:
            therapist_id = context.user_id

        payload = {'full_name': row['full_name']}
        for field in ('gender', 'diagnosis', 'risk', 'status', 'phone', 'email', 'dob'):
            value = row.get(field)
            if value is not None:
                payload[field] = value

        try:
            body = PatientCreateIn(**payload)
            await service.create_patient(body=body, org_id=context.org_id, therapist_id=therapist_id)
            created += 1
        except Exception as exc:
            errors.append({'row': row_number, 'error': f'Could not create patient: {exc}'})

    return {'created': created, 'failed': len(errors), 'errors': errors}


@router.get('/{patient_id}', response_model=PatientOut)
async def get_patient(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('patients.view'),
    service: PatientServiceDb = Depends(get_patient_service),
):
    patient = await service.get_patient(patient_id=patient_id, org_id=context.org_id)
    if patient is None:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return patient


@router.patch('/{patient_id}', response_model=PatientOut)
async def update_patient(
    patient_id: str,
    body: PatientUpdateIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('patients.manage'),
    service: PatientServiceDb = Depends(get_patient_service),
    clinician_service: ClinicianServiceDb = Depends(get_clinician_service),
):
    if body.therapist_id is not None:
        valid = await clinician_service.clinician_exists(
            clinician_id=body.therapist_id, org_id=context.org_id
        )
        if not valid:
            raise HTTPException(status_code=400, detail='That clinician was not found in this practice.')
    patient = await service.update_patient(patient_id=patient_id, org_id=context.org_id, body=body)
    if patient is None:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return patient


@router.post('', response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def create_patient(
    body: PatientCreateIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('patients.manage'),
    service: PatientServiceDb = Depends(get_patient_service),
):
    return await service.create_patient(
        body=body,
        org_id=context.org_id,
        therapist_id=context.user_id,
    )
