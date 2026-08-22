import pytest
import uuid

@pytest.mark.asyncio
async def test_chat_authorization_admin(auth_client_admin):
    response = await auth_client_admin.post("/api/v1/ai/chat/sessions", json={"title": "Test Chat"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Only students can access the AI Student Assistant"

@pytest.mark.asyncio
async def test_create_session_student(auth_client_student):
    response = await auth_client_student.post("/api/v1/ai/chat/sessions", json={"title": "Test Chat"})
    
    assert response.status_code == 200
    assert response.json()["title"] == "Test Chat"
    assert "id" in response.json()

@pytest.mark.asyncio
async def test_send_message_student(auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    # Create session first
    session_response = await auth_client_student.post("/api/v1/ai/chat/sessions", json={"title": "Test Chat"})
    session_id = session_response.json()["id"]

    # Send message
    # Note: AI Provider logic may be mocked or it will return a default response if keys are missing
    # But since it's an integration test, it should work with the mock AI provider we might have
    response = await auth_client_student.post(
        f"/api/v1/ai/chat/sessions/{session_id}/messages", 
        json={"content": "What is life?", "subject_id": demo_subject_id}
    )
    
    assert response.status_code == 200
    assert response.json()["role"] == "ASSISTANT"
    assert "content" in response.json()
    assert "sources" in response.json()
