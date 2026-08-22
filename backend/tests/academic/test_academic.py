import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import User, Student, RoleType, Admin
from app.api.deps import get_current_user

client = TestClient(app)

import pytest
import uuid

@pytest.mark.asyncio
async def test_read_programs(auth_client_student):
    response = await auth_client_student.get("/api/v1/programs")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_create_program_unauthorized(auth_client_student):
    response = await auth_client_student.post("/api/v1/programs", json={"name": "Test", "code": "TST", "description": "Test"})
    # Student doesn't have ADMIN role
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_create_program_admin(auth_client_admin):
    code = f"TST-{uuid.uuid4()}"[:10]
    response = await auth_client_admin.post("/api/v1/programs", json={"name": "Test Program", "code": code, "description": "Test"})
    assert response.status_code == 201
    assert response.json()["name"] == "Test Program"

@pytest.mark.asyncio
async def test_read_subjects(auth_client_student):
    response = await auth_client_student.get("/api/v1/subjects")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_read_subject_not_found(auth_client_student):
    response = await auth_client_student.get(f"/api/v1/subjects/{uuid.uuid4()}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_read_student_me(auth_client_student, demo_student):
    response = await auth_client_student.get("/api/v1/students/me")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == demo_student.name

@pytest.mark.asyncio
async def test_read_student_me_semester(auth_client_student):
    response = await auth_client_student.get("/api/v1/students/me/semester")
    assert response.status_code == 200
