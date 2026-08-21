import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import User, RoleType
from app.models.exam import DifficultyLevel
from app.api.deps import get_current_user
from app.schemas.performance import WeakTopicResponse, RecommendedDifficultyResponse

client = TestClient(app)

mock_student_id = uuid.uuid4()
mock_admin_id = uuid.uuid4()
mock_topic_id = uuid.uuid4()

def override_get_current_student():
    return User(
        id=mock_student_id,
        name="Student",
        email="student@test.com",
        password_hash="hash",
        role=RoleType.STUDENT,
        is_active=True
    )

def override_get_current_admin():
    return User(
        id=mock_admin_id,
        name="Admin",
        email="admin@test.com",
        password_hash="hash",
        role=RoleType.ADMIN,
        is_active=True
    )

@patch("app.services.performance.PerformanceService.get_weak_topics", new_callable=AsyncMock)
def test_get_my_weak_topics(mock_get_weak_topics):
    mock_get_weak_topics.return_value = [
        WeakTopicResponse(
            topic_id=mock_topic_id,
            topic_name="Difficult Topic",
            subject_id=uuid.uuid4(),
            accuracy=40.0,
            attempts=5
        )
    ]
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get("/api/v1/performance/me/weak-topics")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["topic_name"] == "Difficult Topic"
    assert data[0]["accuracy"] == 40.0

@patch("app.services.performance.PerformanceService.get_recommended_difficulty", new_callable=AsyncMock)
def test_get_topic_recommended_difficulty(mock_get_difficulty):
    mock_get_difficulty.return_value = RecommendedDifficultyResponse(
        topic_id=mock_topic_id,
        recommended_difficulty=DifficultyLevel.EASY,
        accuracy=40.0,
        attempts=5
    )
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get(f"/api/v1/performance/me/topics/{mock_topic_id}/difficulty")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    assert response.json()["recommended_difficulty"] == "EASY"
    assert response.json()["accuracy"] == 40.0

def test_performance_unauthorized():
    app.dependency_overrides[get_current_user] = override_get_current_admin
    response = client.get("/api/v1/performance/me/weak-topics")
    app.dependency_overrides.clear()
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Only students can access these performance endpoints"
