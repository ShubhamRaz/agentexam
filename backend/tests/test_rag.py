import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import User, RoleType
from app.api.deps import get_current_active_user, get_current_user
from app.services.rag import rag_service

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

def test_chunk_text():
    text = "A" * 1500
    # chunk_size = 1000, overlap = 200
    chunks = rag_service.chunk_text(text)
    assert len(chunks) == 2
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 700

@patch("app.services.rag.RAGService.search", new_callable=AsyncMock)
def test_search_knowledge_as_teacher(mock_search):
    # Setup mock
    from app.models.rag import DocumentChunk
    mock_chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        content="This is retrieved context.",
        metadata_={"title": "Test PYQ", "source_type": "PYQ"}
    )
    mock_search.return_value = [mock_chunk]

    app.dependency_overrides[get_current_user] = override_get_current_teacher

    response = client.post(
        "/api/v1/knowledge/search",
        json={
            "query": "test query",
            "subject_id": str(uuid.uuid4()),
            "top_k": 5
        }
    )
    
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0]["content"] == "This is retrieved context."

def test_search_knowledge_as_student():
    app.dependency_overrides[get_current_user] = override_get_current_student

    response = client.post(
        "/api/v1/knowledge/search",
        json={
            "query": "test query",
            "subject_id": str(uuid.uuid4()),
            "top_k": 5
        }
    )
    
    app.dependency_overrides.clear()
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to search knowledge directly."
