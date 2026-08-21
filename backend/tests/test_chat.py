import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import User, RoleType
from app.api.deps import get_current_user
from app.services.chat import chat_service

client = TestClient(app)

mock_teacher_id = uuid.uuid4()
mock_student_id = uuid.uuid4()

def override_get_current_teacher():
    user = User(
        id=mock_teacher_id,
        name="Test Teacher",
        email="teacher@test.com",
        password_hash="hash",
        role=RoleType.TEACHER,
        is_active=True
    )
    return user

def override_get_current_student():
    user = User(
        id=mock_student_id,
        name="Test Student",
        email="student@test.com",
        password_hash="hash",
        role=RoleType.STUDENT,
        is_active=True
    )
    return user


def test_chat_authorization_teacher():
    app.dependency_overrides[get_current_user] = override_get_current_teacher
    
    response = client.post("/api/v1/ai/chat/sessions", json={"title": "Test Chat"})
    
    app.dependency_overrides.clear()
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Only students can access the AI Student Assistant"


@patch("app.services.chat.ChatService.create_session", new_callable=AsyncMock)
def test_create_session_student(mock_create):
    from app.models.chat import ChatSession
    from datetime import datetime
    mock_session = ChatSession(
        id=uuid.uuid4(),
        student_id=mock_student_id,
        title="Test Chat",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    mock_create.return_value = mock_session

    app.dependency_overrides[get_current_user] = override_get_current_student
    
    response = client.post("/api/v1/ai/chat/sessions", json={"title": "Test Chat"})
    
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json()["title"] == "Test Chat"
    assert "id" in response.json()

@patch("app.services.chat.ChatService.send_message", new_callable=AsyncMock)
def test_send_message_student(mock_send):
    from app.models.chat import ChatMessage, ChatRole
    from datetime import datetime
    mock_message = ChatMessage(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        role=ChatRole.ASSISTANT,
        content="This is a mock assistant response.",
        sources=[{"title": "Test Source", "document_id": str(uuid.uuid4()), "type": "PYQ"}],
        created_at=datetime.utcnow()
    )
    mock_send.return_value = mock_message

    app.dependency_overrides[get_current_user] = override_get_current_student
    
    response = client.post(
        f"/api/v1/ai/chat/sessions/{uuid.uuid4()}/messages", 
        json={"content": "What is life?", "subject_id": str(uuid.uuid4())}
    )
    
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json()["role"] == "ASSISTANT"
    assert response.json()["content"] == "This is a mock assistant response."
    assert len(response.json()["sources"]) == 1
    assert response.json()["sources"][0]["title"] == "Test Source"
