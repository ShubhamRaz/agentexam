import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, RoleType
from app.api.deps import get_current_active_user, get_current_user

import pytest
import uuid
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_evaluate_exam_and_results(auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    # First create and submit an exam
    response = await auth_client_student.post("/api/v1/exams", json={
        "subject_id": demo_subject_id,
        "test_type": "THEORY",
        "difficulty_level": "MEDIUM",
        "question_count": 1,
        "duration_minutes": 60
    })
    exam_id = response.json()["id"]
    
    await auth_client_student.post(f"/api/v1/exams/{exam_id}/start")
    await auth_client_student.post(f"/api/v1/exams/{exam_id}/submit")
    
    # Now evaluate the exam (Mocking the AI evaluation service)
    with patch("app.api.routes.results.evaluation_service.evaluate_exam", new_callable=AsyncMock) as mock_evaluate:
        class FakeResult:
            id = uuid.uuid4()
            test_id = uuid.UUID(exam_id)
            student_id = uuid.uuid4()
            total_marks = 100
            obtained_marks = 80
            percentage = 80.0
            grade = "B"
            pass_status = True
            
        mock_evaluate.return_value = FakeResult()
        
        response = await auth_client_student.post(f"/api/v1/results/exams/{exam_id}/evaluate")
        
        assert response.status_code == 201
        data = response.json()
        assert data["percentage"] == 80.0
        assert data["grade"] == "B"

@pytest.mark.asyncio
async def test_read_results(auth_client_student):
    # This will hit the real DB, should return empty or some items if seeded
    response = await auth_client_student.get("/api/v1/results")
    
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
