import pytest
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, User, RoleType
from app.api.deps import get_current_active_user, get_current_user
from app.models.exam import QuestionType, DifficultyLevel
from app.models.ai import AIGenerationJob, JobStatus

client = TestClient(app)

mock_student_id = uuid.uuid4()
mock_teacher_id = uuid.uuid4()
mock_subject_id = uuid.uuid4()
mock_job_id = uuid.uuid4()

mock_student = Student(
    id=mock_student_id,
    name="Test Student",
    email="student@example.com",
    role=RoleType.STUDENT,
    is_active=True
)

mock_teacher = User(
    id=mock_teacher_id,
    name="Test Teacher",
    email="teacher@example.com",
    role=RoleType.TEACHER,
    is_active=True
)

def override_get_current_student():
    return mock_student

def override_get_current_teacher():
    return mock_teacher

@pytest.fixture
def auth_override_student():
    app.dependency_overrides[get_current_user] = override_get_current_student
    app.dependency_overrides[get_current_active_user] = override_get_current_student
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def auth_override_teacher():
    app.dependency_overrides[get_current_user] = override_get_current_teacher
    app.dependency_overrides[get_current_active_user] = override_get_current_teacher
    yield
    app.dependency_overrides.clear()

def create_mock_job(status=JobStatus.PENDING):
    return AIGenerationJob(
        id=mock_job_id,
        subject_id=mock_subject_id,
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.MEDIUM,
        marks=5.0,
        count=2,
        status=status,
        created_by=mock_teacher_id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )


def test_generate_questions_unauthorized(auth_override_student):
    """ Students cannot generate AI questions """
    response = client.post("/api/v1/ai/questions/generate", json={
        "subject_id": str(mock_subject_id),
        "question_type": "MCQ",
        "difficulty": "MEDIUM",
        "marks": 5,
        "count": 2
    })
    assert response.status_code == 403
    assert response.json()["detail"] == "Only teachers and admins can generate AI questions"

def test_generate_questions_authorized(auth_override_teacher):
    """ Teachers can generate AI questions """
    with patch("app.api.routes.ai.ai_service.create_generation_job", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = create_mock_job()
        
        response = client.post("/api/v1/ai/questions/generate", json={
            "subject_id": str(mock_subject_id),
            "question_type": "MCQ",
            "difficulty": "MEDIUM",
            "marks": 5,
            "count": 2
        })
        
        assert response.status_code == 202
        data = response.json()
        assert data["id"] == str(mock_job_id)
        assert data["status"] == JobStatus.PENDING
        mock_create.assert_called_once()

def test_get_generation_job_status(auth_override_teacher):
    """ Teachers can check job status """
    with patch("app.api.routes.ai.ai_service.get_job", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = create_mock_job(status=JobStatus.COMPLETED)
        
        response = client.get(f"/api/v1/ai/questions/generation/{mock_job_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(mock_job_id)
        assert data["status"] == JobStatus.COMPLETED
