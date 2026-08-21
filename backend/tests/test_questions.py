import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from datetime import datetime

from app.main import app
from app.models.user import User, Student, RoleType, Admin
from app.api.deps import get_current_user, get_current_active_user
from app.models.exam import Question, QuestionType, DifficultyLevel, QuestionSource, QuestionStatus
from app.schemas.question import QuestionResponseAdmin, QuestionResponseStudent

client = TestClient(app)

mock_student = Student(
    id=uuid.uuid4(),
    name="Test Student",
    email="student@example.com",
    role=RoleType.STUDENT,
    is_active=True
)

mock_admin = Admin(
    id=uuid.uuid4(),
    name="Test Admin",
    email="admin@example.com",
    role=RoleType.ADMIN,
    is_active=True
)

def override_get_current_student():
    return mock_student

def override_get_current_admin():
    return mock_admin

@pytest.fixture
def as_student():
    app.dependency_overrides[get_current_user] = override_get_current_student
    app.dependency_overrides[get_current_active_user] = override_get_current_student
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def as_admin():
    app.dependency_overrides[get_current_user] = override_get_current_admin
    app.dependency_overrides[get_current_active_user] = override_get_current_admin
    yield
    app.dependency_overrides.clear()

# Mock Data
mock_question_id = uuid.uuid4()
mock_subject_id = uuid.uuid4()

mock_question = Question(
    id=mock_question_id,
    subject_id=mock_subject_id,
    question_type=QuestionType.MCQ,
    question_text="What is Python?",
    marks=5,
    difficulty_level=DifficultyLevel.EASY,
    source=QuestionSource.MANUAL,
    status=QuestionStatus.ACTIVE,
    options=[
        {"id": "A", "text": "A language", "is_correct": True},
        {"id": "B", "text": "A snake", "is_correct": False}
    ],
    correct_answer="A",
    explanation="Python is a language.",
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)

def test_student_read_question(as_student):
    with patch("app.api.routes.questions.question_service.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_question
        
        response = client.get(f"/api/v1/questions/{mock_question_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["question_text"] == "What is Python?"
        # Ensure student does not see correct answer or explanation
        assert "correct_answer" not in data
        assert "explanation" not in data
        
        # Ensure option does not have is_correct
        assert "is_correct" not in data["options"][0]

def test_admin_read_question(as_admin):
    with patch("app.api.routes.questions.question_service.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_question
        
        response = client.get(f"/api/v1/questions/{mock_question_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Admin gets everything
        assert data["correct_answer"] == "A"
        assert data["explanation"] == "Python is a language."
        assert "is_correct" in data["options"][0]

def test_student_cannot_create(as_student):
    response = client.post("/api/v1/questions", json={
        "subject_id": str(mock_subject_id),
        "question_type": "MCQ",
        "question_text": "Test",
        "marks": 5,
        "difficulty_level": "EASY"
    })
    assert response.status_code == 403

def test_admin_can_create(as_admin):
    with patch("app.api.routes.questions.question_service.create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_question
        response = client.post("/api/v1/questions", json={
            "subject_id": str(mock_subject_id),
            "question_type": "MCQ",
            "question_text": "What is Python?",
            "marks": 5,
            "difficulty_level": "EASY"
        })
        assert response.status_code == 201
