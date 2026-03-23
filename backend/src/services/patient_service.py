from backend.src.schemas.patients import PatientCreateIn


class PatientService:
    async def list_patients(self) -> dict:
        return {'status': 'not_implemented', 'module': 'patient_service', 'action': 'list'}

    async def create_patient(self, body: PatientCreateIn) -> dict:
        return {'status': 'not_implemented', 'module': 'patient_service', 'action': 'create'}
