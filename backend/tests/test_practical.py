import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, RoleType
from app.api.deps import get_current_active_user, get_current_user
from app.models.exam import MockTest, ExamStatus, TestType, DifficultyLevel
from app.models.practical import PracticalSubmission, Experiment

client = TestClient(app)

mock_student_id = uuid.uuid4()
mock_subject_id = uuid.uuid4()
mock_session_id = uuid.uuid4()
mock_experiment_id = uuid.uuid4()

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
    app.dependency_overrides[get_current_user] = override_get_current_student
    app.dependency_overrides[get_current_active_user] = override_get_current_student
    yield
    app.dependency_overrides.clear()

def create_mock_session(status=ExamStatus.DRAFT, expired=False):
    now = datetime.utcnow()
    expires = now - timedelta(minutes=10) if expired else now + timedelta(minutes=120)
    
    session = MockTest(
        id=mock_session_id,
        student_id=mock_student_id,
        subject_id=mock_subject_id,
        test_type=TestType.PRACTICAL,
        difficulty_level=DifficultyLevel.MEDIUM,
        duration_minutes=120,
        total_marks=20,
        status=status,
        started_at=now if status != ExamStatus.DRAFT else None,
        expires_at=expires if status != ExamStatus.DRAFT else None,
        submitted_at=None
    )
    
    experiment = Experiment(
        id=mock_experiment_id,
        subject_id=mock_subject_id,
        title="Test Experiment",
        marks=20
    )
    
    session.experiments = [experiment]
    return session

def test_create_practical_session(auth_override):
    with patch("app.api.routes.practical.practical_service.create_practical_session", new_callable=AsyncMock) as mock_create, \
         patch("app.api.routes.practical.practical_service.start_session", new_callable=AsyncMock) as mock_start:
        
        mock_create.return_value = create_mock_session()
        mock_start.return_value = create_mock_session(status=ExamStatus.IN_PROGRESS)
        
        response = client.post("/api/v1/practical/start", json={
            "subject_id": str(mock_subject_id),
            "duration_minutes": 120,
            "difficulty_level": "MEDIUM"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "IN_PROGRESS"
        assert data["test_type"] == "PRACTICAL"
        assert len(data["assigned_experiments"]) == 1

def test_save_practical_submission(auth_override):
    with patch("app.api.routes.practical.practical_service.save_submission", new_callable=AsyncMock) as mock_save:
        class FakeSubmission:
            id = uuid.uuid4()
            experiment_id = mock_experiment_id
            answer_text = "Step 1, Step 2"
            file_reference = None
            submitted_at = datetime.utcnow()
            evaluation = None
            
        mock_save.return_value = FakeSubmission()
        
        response = client.put(f"/api/v1/practical/{mock_session_id}/submissions", json={
            "experiment_id": str(mock_experiment_id),
            "answer_text": "Step 1, Step 2"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["answer_text"] == "Step 1, Step 2"

def test_submit_practical_session(auth_override):
    with patch("app.api.routes.practical.practical_service.submit_session", new_callable=AsyncMock) as mock_submit:
        mock_submit.return_value = create_mock_session(status=ExamStatus.SUBMITTED)
        
        response = client.post(f"/api/v1/practical/{mock_session_id}/submit")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUBMITTED"
