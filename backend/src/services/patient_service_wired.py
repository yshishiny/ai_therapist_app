from backend.src.repositories.patient_repository import PatientRepository
from backend.src.schemas.patients import PatientCreateIn


class PatientServiceWired:
    def __init__(self, repository: PatientRepository | None = None):
        self.repository = repository or PatientRepository()

    async def list_patients(self) -> dict:
        patients = await self.repository.list_patients()
        return {
            'status': 'stubbed',
            'module': 'patient_service',
            'action': 'list',
            'count': len(patients),
            'items': patients,
        }

    async def get_patient(self, patient_id: str) -> dict:
        patient = await self.repository.get_patient(patient_id)
        return {
            'status': 'stubbed',
            'module': 'patient_service',
            'action': 'get',
            'patient_id': patient_id,
            'found': patient is not None,
            'item': patient,
        }

    async def create_patient(self, body: PatientCreateIn) -> dict:
        payload = body.model_dump()
        created = await self.repository.create_patient(payload)
        return {
            'status': 'stubbed',
            'module': 'patient_service',
            'action': 'create',
            'item': created,
        }
