import uuid

from fastapi import HTTPException, status

from backend.src.repositories.ai_reporting_repository_db_real import AiReportingRepositoryDbReal
from backend.src.schemas.ai_reporting import ReportGenerationRequest


class AiReportingServiceDb:
    def __init__(self, repository: AiReportingRepositoryDbReal):
        self.repository = repository

    async def generate_clinical_synthesis(
        self,
        patient_id: str,
        org_id: str,
        user_id: str,
        body: ReportGenerationRequest,
    ) -> dict:
        """Generate a clinical synthesis report for a patient."""
        patient = await self.repository.get_patient_summary(patient_id, org_id)
        if patient is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found.",
            )

        sections = [
            "# Clinical Synthesis",
            "",
            "## Patient",
            f"- Name: {patient['full_name']}",
            f"- Diagnosis: {patient['diagnosis'] or 'Not documented'}",
            f"- Risk: {patient['risk'] or 'Unknown'}",
            f"- Status: {patient['status'] or 'Unknown'}",
        ]

        if body.include_sessions:
            sessions = await self.repository.get_recent_sessions(patient_id, limit=5)
            sections.extend(["", "## Recent Sessions"])
            if sessions:
                for session in sessions:
                    sections.append(
                        f"- {session['created_at']}: {session['template']} | "
                        f"assessment: {session['assessment'] or 'n/a'} | "
                        f"plan: {session['plan'] or 'n/a'}"
                    )
            else:
                sections.append("- No recent session notes were found.")

        if body.include_assessments:
            assessments = await self.repository.get_recent_assessments(patient_id, limit=10)
            sections.extend(["", "## Assessments"])
            if assessments:
                for assessment in assessments:
                    sections.append(
                        f"- {assessment['created_at']}: {assessment['assessment_id']} "
                        f"scored {assessment['raw_score']} ({assessment['severity']})"
                    )
            else:
                sections.append("- No assessment results were found.")

        if body.include_homework:
            homework = await self.repository.get_recent_homework(patient_id, limit=10)
            sections.extend(["", "## Homework"])
            if homework:
                for item in homework:
                    sections.append(
                        f"- {item['title']}: {item['status']} "
                        f"(due {item['due_date'] or 'unspecified'})"
                    )
            else:
                sections.append("- No homework records were found.")

        return {
            "status": "completed",
            "patient_id": patient_id,
            "requested_by": user_id,
            "report_id": str(uuid.uuid4()),
            "report_markdown": "\n".join(sections),
        }

    async def patient_ai_chat(
        self,
        patient_id: str,
        conversation_id: str | None,
        message: str,
    ) -> dict:
        """Handle AI chat for patients (stub implementation)."""
        reply = (
            "I hear you. Let's slow this down together. "
            "Notice what feels strongest right now, take one steady breath, "
            "and name one small supportive step you can take before your next session."
        )
        return {
            "patient_id": patient_id,
            "conversation_id": conversation_id or str(uuid.uuid4()),
            "reply": reply,
        }
