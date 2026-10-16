import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.models.user import User, RoleType
from app.core.security import get_password_hash, create_access_token
import uuid
import datetime

client = TestClient(app)

import pytest
import datetime
import uuid

@pytest.mark.asyncio
async def test_register_success(client):
    unique_email = f"new_student_{uuid.uuid4()}@example.com"
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "StrongPassword123",
            "name": "New Test Student",
            "role": "STUDENT"
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert "password" not in data
    assert "password_hash" not in data

@pytest.mark.asyncio
async def test_register_duplicate_email(client, demo_student):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": demo_student.email,
            "password": "StrongPassword123",
            "name": "Test Student Duplicate"
        },
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_success(client, demo_student):
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": demo_student.email,
            "password": "demopass"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password(client, demo_student):
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": demo_student.email,
            "password": "WrongPassword"
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_login_unknown_email(client):
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "unknown@example.com",
            "password": "StrongPassword123"
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_read_users_me_success(auth_client_student, demo_student):
    response = await auth_client_student.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == demo_student.email
    assert "password" not in data

@pytest.mark.asyncio
async def test_read_users_me_missing_token(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

@pytest.mark.asyncio
async def test_read_users_me_invalid_token(client):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_read_users_me_expired_token(client, demo_student):
    from app.core.security import create_access_token
    token = create_access_token(
        subject=str(demo_student.id), 
        role=demo_student.role, 
        expires_delta=datetime.timedelta(minutes=-1)
    )
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
