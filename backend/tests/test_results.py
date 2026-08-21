import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, RoleType
from app.api.deps import get_current_active_user, get_current_user

client = TestClient(app)

mock_student_id = uuid.uuid4()
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
    app.dependency_overrides[get_current_user] = override_get_current_student
    app.dependency_overrides[get_current_active_user] = override_get_current_student
    yield
    app.dependency_overrides.clear()

def test_evaluate_exam(auth_override):
    with patch("app.api.routes.results.evaluation_service.evaluate_exam", new_callable=AsyncMock) as mock_evaluate:
        class FakeResult:
            id = uuid.uuid4()
            test_id = mock_exam_id
            student_id = mock_student_id
            total_marks = 100
            obtained_marks = 80
            percentage = 80.0
            grade = "B"
            pass_status = True
            
        mock_evaluate.return_value = FakeResult()
        
        response = client.post(f"/api/v1/results/exams/{mock_exam_id}/evaluate")
        
        assert response.status_code == 201
        data = response.json()
        assert data["percentage"] == 80.0
        assert data["grade"] == "B"
        assert data["pass_status"] is True

def test_get_exam_result(auth_override):
    with patch("app.api.routes.results.evaluation_service.get_detailed_result", new_callable=AsyncMock) as mock_get_result:
        mock_get_result.return_value = {
            "id": str(uuid.uuid4()),
            "test_id": str(mock_exam_id),
            "student_id": str(mock_student_id),
            "total_marks": 50,
            "obtained_marks": 20,
            "percentage": 40.0,
            "grade": "F",
            "pass_status": True,
            "question_results": []
        }
        
        response = client.get(f"/api/v1/results/exams/{mock_exam_id}/result")
        
        assert response.status_code == 200
        data = response.json()
        assert data["test_id"] == str(mock_exam_id)
        assert data["total_marks"] == 50.0

def test_read_results(auth_override):
    with patch("app.api.routes.results.evaluation_service.get_multi", new_callable=AsyncMock) as mock_get_multi:
        mock_get_multi.return_value = ([], 0)
        
        response = client.get("/api/v1/results")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
