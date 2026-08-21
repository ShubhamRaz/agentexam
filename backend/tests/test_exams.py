import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, RoleType
from app.api.deps import get_current_active_user, get_current_user
from app.models.exam import MockTest, ExamStatus, TestType, DifficultyLevel

client = TestClient(app)

mock_student_id = uuid.uuid4()
mock_subject_id = uuid.uuid4()
mock_exam_id = uuid.uuid4()

mock_student = Student(
    id=mock_student_id,
    name="Test Student",
    email="student@example.com",
    role=RoleType.STUDENT,
    is_active=True
)

def override_get_current_student():
    return mock_student

@pytest.fixture
def auth_override():
    # require_role is a factory, so we need to override get_current_active_user
    app.dependency_overrides[get_current_user] = override_get_current_student
    app.dependency_overrides[get_current_active_user] = override_get_current_student
    yield
    app.dependency_overrides.clear()

def create_mock_exam(status=ExamStatus.DRAFT, expired=False):
    now = datetime.utcnow()
    expires = now - timedelta(minutes=10) if expired else now + timedelta(minutes=60)
    
    exam = MockTest(
        id=mock_exam_id,
        student_id=mock_student_id,
        subject_id=mock_subject_id,
        test_type=TestType.THEORY,
        difficulty_level=DifficultyLevel.MEDIUM,
        duration_minutes=60,
        total_marks=50,
        status=status,
        started_at=now if status != ExamStatus.DRAFT else None,
        expires_at=expires if status != ExamStatus.DRAFT else None,
        submitted_at=None
    )
    exam.questions = []
    return exam

def test_create_exam(auth_override):
    with patch("app.api.routes.exams.exam_engine.create_mock_test", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = create_mock_exam()
        
        response = client.post("/api/v1/exams", json={
            "subject_id": str(mock_subject_id),
            "test_type": "THEORY",
            "difficulty_level": "MEDIUM",
            "question_count": 5,
            "duration_minutes": 60
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "DRAFT"

def test_start_exam(auth_override):
    with patch("app.api.routes.exams.exam_engine.start_exam", new_callable=AsyncMock) as mock_start:
        mock_start.return_value = create_mock_exam(status=ExamStatus.IN_PROGRESS)
        
        response = client.post(f"/api/v1/exams/{mock_exam_id}/start")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "IN_PROGRESS"
        assert "questions" in data
        assert "saved_answers" in data

def test_save_answer(auth_override):
    with patch("app.api.routes.exams.exam_engine.save_answer", new_callable=AsyncMock) as mock_save:
        class FakeAnswer:
            id = uuid.uuid4()
            question_id = uuid.uuid4()
            selected_option_id = "A"
            answer_text = None
            answered_at = datetime.utcnow()
            
        mock_save.return_value = FakeAnswer()
        question_id = uuid.uuid4()
        
        response = client.put(f"/api/v1/exams/{mock_exam_id}/answers/{question_id}", json={
            "question_id": str(question_id),
            "selected_option_id": "A"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["selected_option_id"] == "A"

def test_submit_exam(auth_override):
    with patch("app.api.routes.exams.exam_engine.submit_exam", new_callable=AsyncMock) as mock_submit:
        mock_submit.return_value = create_mock_exam(status=ExamStatus.SUBMITTED)
        
        response = client.post(f"/api/v1/exams/{mock_exam_id}/submit")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUBMITTED"
