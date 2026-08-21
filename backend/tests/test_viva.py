import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, User, RoleType
from app.api.deps import get_current_active_user, get_current_user
from app.models.exam import MockTest, ExamStatus, TestType, DifficultyLevel, Question, QuestionType, Answer, Evaluation

client = TestClient(app)

mock_student_id = uuid.uuid4()
mock_teacher_id = uuid.uuid4()
mock_subject_id = uuid.uuid4()
mock_session_id = uuid.uuid4()
mock_question_id = uuid.uuid4()
mock_answer_id = uuid.uuid4()

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

def create_mock_session(status=ExamStatus.DRAFT, expired=False):
    now = datetime.utcnow()
    expires = now - timedelta(minutes=10) if expired else now + timedelta(minutes=30)
    
    session = MockTest(
        id=mock_session_id,
        student_id=mock_student_id,
        subject_id=mock_subject_id,
        test_type=TestType.VIVA,
        difficulty_level=DifficultyLevel.MEDIUM,
        duration_minutes=30,
        total_marks=10,
        status=status,
        started_at=now if status != ExamStatus.DRAFT else None,
        expires_at=expires if status != ExamStatus.DRAFT else None,
        submitted_at=None
    )
    
    question = Question(
        id=mock_question_id,
        subject_id=mock_subject_id,
        question_type=QuestionType.VIVA,
        question_text="What is polymorphic behavior?",
        marks=10,
        difficulty_level=DifficultyLevel.MEDIUM,
        source="MANUAL",
        status="ACTIVE",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.questions = [question]
    return session

def test_create_viva_session(auth_override_student):
    with patch("app.api.routes.viva.viva_service.create_viva_session", new_callable=AsyncMock) as mock_create, \
         patch("app.api.routes.viva.viva_service.start_session", new_callable=AsyncMock) as mock_start:
        
        mock_create.return_value = create_mock_session()
        mock_start.return_value = create_mock_session(status=ExamStatus.IN_PROGRESS)
        
        response = client.post("/api/v1/vivas/start", json={
            "subject_id": str(mock_subject_id),
            "duration_minutes": 30,
            "difficulty_level": "MEDIUM",
            "question_count": 1
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "IN_PROGRESS"
        assert data["test_type"] == "VIVA"
        assert len(data["questions"]) == 1

def test_save_viva_answer(auth_override_student):
    with patch("app.api.routes.viva.viva_service.save_answer", new_callable=AsyncMock) as mock_save:
        answer = Answer(
            id=mock_answer_id,
            test_id=mock_session_id,
            question_id=mock_question_id,
            student_id=mock_student_id,
            answer_text="It allows objects to be treated as instances of their parent class.",
            answered_at=datetime.utcnow()
        )
        mock_save.return_value = answer
        
        response = client.put(f"/api/v1/vivas/{mock_session_id}/answers/{mock_question_id}", json={
            "answer_text": "It allows objects to be treated as instances of their parent class."
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["answer_text"] == "It allows objects to be treated as instances of their parent class."

def test_submit_viva_session(auth_override_student):
    with patch("app.api.routes.viva.viva_service.submit_session", new_callable=AsyncMock) as mock_submit:
        mock_submit.return_value = create_mock_session(status=ExamStatus.SUBMITTED)
        
        response = client.post(f"/api/v1/vivas/{mock_session_id}/submit")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUBMITTED"

def test_evaluate_viva_answer(auth_override_teacher):
    with patch("app.api.routes.viva.viva_service.evaluate_answer", new_callable=AsyncMock) as mock_eval:
        evaluation = Evaluation(
            id=uuid.uuid4(),
            answer_id=mock_answer_id,
            evaluated_by=mock_teacher_id,
            marks_obtained=8.5,
            feedback="Good definition, but missed method overriding context."
        )
        mock_eval.return_value = evaluation
        
        response = client.patch(
            f"/api/v1/vivas/{mock_session_id}/answers/{mock_question_id}/evaluate",
            params={"student_id": str(mock_student_id)},
            json={
                "marks_obtained": 8.5,
                "feedback": "Good definition, but missed method overriding context."
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["marks_obtained"] == 8.5
        assert data["feedback"] == "Good definition, but missed method overriding context."
