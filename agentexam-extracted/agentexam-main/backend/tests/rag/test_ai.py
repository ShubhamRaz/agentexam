import pytest
import uuid
from app.models.exam import QuestionType, DifficultyLevel
from app.models.ai import JobStatus

@pytest.mark.asyncio
async def test_generate_questions_unauthorized(auth_client_student, demo_subject_id):
    """ Students cannot generate AI questions """
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    response = await auth_client_student.post("/api/v1/ai/questions/generate", json={
        "subject_id": demo_subject_id,
        "question_type": "MCQ",
        "difficulty": "MEDIUM",
        "marks": 5,
        "count": 2
    })
    assert response.status_code == 403
    assert response.json()["detail"] == "Only teachers and admins can generate AI questions"

from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_generate_questions_authorized(auth_client_admin, demo_subject_id):
    """ Admins/Teachers can generate AI questions """
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    with patch("app.services.ai.ai_service.run_generation_task", new_callable=AsyncMock):
        response = await auth_client_admin.post("/api/v1/ai/questions/generate", json={
            "subject_id": demo_subject_id,
            "question_type": "MCQ",
            "difficulty": "MEDIUM",
            "marks": 5,
            "count": 2
        })
        
        assert response.status_code == 202
        data = response.json()
        assert "id" in data
        assert data["status"] in [JobStatus.PENDING, JobStatus.RUNNING, JobStatus.COMPLETED, JobStatus.FAILED]
        
        # Check job status
        job_id = data["id"]
        status_response = await auth_client_admin.get(f"/api/v1/ai/questions/generation/{job_id}")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["id"] == job_id
        assert "status" in status_data
