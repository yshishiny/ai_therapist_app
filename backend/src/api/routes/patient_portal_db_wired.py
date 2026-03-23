from fastapi import APIRouter

from backend.src.schemas.patient_portal import FcmTokenIn, HomeworkSubmitIn, MoodLogIn

router = APIRouter(prefix='/me', tags=['patient'])


@router.post('/fcm-token')
async def register_fcm_token(body: FcmTokenIn):
    return {'status': 'portal-scaffold', 'action': 'register_fcm_token', 'has_token': bool(body.fcm_token)}


@router.get('/profile')
async def get_my_profile():
    return {'status': 'portal-scaffold', 'action': 'get_profile'}


@router.post('/mood')
async def log_mood(body: MoodLogIn):
    return {'status': 'portal-scaffold', 'action': 'log_mood', 'mood_score': body.mood_score, 'energy_score': body.energy_score}


@router.get('/mood')
async def get_mood_history(days: int = 30):
    return {'status': 'portal-scaffold', 'action': 'get_mood_history', 'days': days}


@router.get('/homework')
async def get_my_homework():
    return {'status': 'portal-scaffold', 'action': 'get_my_homework'}


@router.post('/homework/{task_id}/submit')
async def submit_my_homework(task_id: str, body: HomeworkSubmitIn):
    return {'status': 'portal-scaffold', 'action': 'submit_my_homework', 'task_id': task_id, 'has_notes': body.completion_notes is not None}
