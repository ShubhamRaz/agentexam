import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import User, Student, RoleType, Admin
from app.api.deps import get_current_user

client = TestClient(app)

# Mock Data
mock_student_id = uuid.uuid4()
mock_admin_id = uuid.uuid4()

mock_student = Student(
    id=mock_student_id,
    name="Test Student",
    email="student@example.com",
    role=RoleType.STUDENT,
    is_active=True,
    semester="3",
    department="CSE"
)

mock_admin = Admin(
    id=mock_admin_id,
    name="Test Admin",
    email="admin@example.com",
    role=RoleType.ADMIN,
    is_active=True,
    level="SUPER"
)

def override_get_current_student():
    return mock_student

def override_get_current_admin():
    return mock_admin

@pytest.fixture(autouse=True)
def setup_auth():
    app.dependency_overrides[get_current_user] = override_get_current_student
    yield
    app.dependency_overrides.clear()

# --- Program Tests ---
def test_read_programs():
    with patch("app.api.routes.programs.academic_service.get_programs", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []
        response = client.get("/api/v1/programs")
        assert response.status_code == 200
        assert response.json() == []

def test_create_program_unauthorized():
    response = client.post("/api/v1/programs", json={"name": "Test", "code": "TST"})
    # Student doesn't have ADMIN role
    assert response.status_code == 403

def test_create_program_admin():
    app.dependency_overrides[get_current_user] = override_get_current_admin
    with patch("app.api.routes.programs.academic_service.create_program", new_callable=AsyncMock) as mock_create:
        import app.models.academic as ac
        mock_prog = ac.Course(id=uuid.uuid4(), name="Test", code="TST")
        mock_create.return_value = mock_prog
        response = client.post("/api/v1/programs", json={"name": "Test", "code": "TST"})
        assert response.status_code == 201
        assert response.json()["name"] == "Test"

# --- Subject Tests ---
def test_read_subjects():
    with patch("app.api.routes.subjects.academic_service.get_subjects", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []
        response = client.get("/api/v1/subjects")
        assert response.status_code == 200

def test_read_subject_not_found():
    with patch("app.api.routes.subjects.academic_service.get_subject", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        response = client.get(f"/api/v1/subjects/{uuid.uuid4()}")
        assert response.status_code == 404

# --- Student Tests ---
def test_read_student_me():
    response = client.get("/api/v1/students/me")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Student"
    assert data["semester"] == "3"

def test_read_student_me_semester():
    response = client.get("/api/v1/students/me/semester")
    assert response.status_code == 200
    assert response.json() == "3"
