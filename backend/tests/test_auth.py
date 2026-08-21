import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.models.user import User, RoleType
from app.core.security import get_password_hash, create_access_token
import uuid
import datetime

client = TestClient(app)

# Mock Data
mock_user_id = uuid.uuid4()
mock_password = "StrongPassword123"
mock_hashed_password = get_password_hash(mock_password)

mock_user = User(
    id=mock_user_id,
    email="student@example.com",
    name="Test Student",
    password_hash=mock_hashed_password,
    role=RoleType.STUDENT,
    is_active=True,
    created_at=datetime.datetime.now(datetime.timezone.utc),
    updated_at=datetime.datetime.now(datetime.timezone.utc)
)

mock_inactive_user = User(
    id=uuid.uuid4(),
    email="inactive@example.com",
    name="Inactive Student",
    password_hash=mock_hashed_password,
    role=RoleType.STUDENT,
    is_active=False
)

def test_register_success():
    with patch("app.api.routes.auth.user_service.get_user_by_email", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None  # No existing user
        with patch("app.api.routes.auth.user_service.create_user", new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_user
            
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "student@example.com",
                    "password": "StrongPassword123",
                    "name": "Test Student",
                    "role": "STUDENT"
                },
            )
            assert response.status_code == 201
            data = response.json()
            assert data["email"] == "student@example.com"
            assert "password" not in data
            assert "password_hash" not in data

def test_register_duplicate_email():
    with patch("app.api.routes.auth.user_service.get_user_by_email", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_user  # User already exists
        
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "student@example.com",
                "password": "StrongPassword123",
                "name": "Test Student"
            },
        )
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

def test_login_success():
    with patch("app.api.routes.auth.user_service.get_user_by_email", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_user
        
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "student@example.com",
                "password": "StrongPassword123"
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

def test_login_wrong_password():
    with patch("app.api.routes.auth.user_service.get_user_by_email", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_user
        
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "student@example.com",
                "password": "WrongPassword"
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Incorrect email or password"

def test_login_unknown_email():
    with patch("app.api.routes.auth.user_service.get_user_by_email", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "unknown@example.com",
                "password": "StrongPassword123"
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Incorrect email or password"

def test_login_inactive_user():
    with patch("app.api.routes.auth.user_service.get_user_by_email", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_inactive_user
        
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "inactive@example.com",
                "password": "StrongPassword123"
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Inactive user"

def test_read_users_me_success():
    token = create_access_token(subject=mock_user_id, role="STUDENT")
    
    from unittest.mock import MagicMock
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_user
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    
    mock_session = AsyncMock()
    mock_session.execute.return_value = mock_result
    
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_session
    
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    app.dependency_overrides.clear()
        
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == mock_user.email
    assert "password" not in data

def test_read_users_me_missing_token():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_read_users_me_invalid_token():
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401

def test_read_users_me_expired_token():
    # Create an expired token by passing a negative timedelta
    token = create_access_token(
        subject=mock_user_id, 
        role="STUDENT", 
        expires_delta=datetime.timedelta(minutes=-1)
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
