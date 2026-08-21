import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import User, RoleType
from app.api.deps import get_current_user
from app.schemas.performance import PerformanceOverviewResponse, TopicPerformanceResponse

client = TestClient(app)

mock_student_id = uuid.uuid4()

def override_get_current_student():
    return User(
        id=mock_student_id,
        name="Student",
        email="student@test.com",
        password_hash="hash",
        role=RoleType.STUDENT,
        is_active=True
    )

@patch("app.services.performance.PerformanceService.get_performance_overview", new_callable=AsyncMock)
def test_get_my_performance_overview(mock_overview):
    mock_overview.return_value = PerformanceOverviewResponse(
        overall_accuracy=78.5,
        strong_topics=[
            TopicPerformanceResponse(
                topic_id=uuid.uuid4(),
                topic_name="Quantum Physics",
                subject_id=uuid.uuid4(),
                accuracy=85.0,
                attempts=5
            )
        ],
        weak_topics=[],
        insufficient_data_topics=[]
    )
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get("/api/v1/performance/me")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["overall_accuracy"] == 78.5
    assert len(data["strong_topics"]) == 1
    assert data["strong_topics"][0]["topic_name"] == "Quantum Physics"

@patch("app.services.performance.PerformanceService.get_topic_performance", new_callable=AsyncMock)
def test_get_topics_performance(mock_topics):
    mock_topics.return_value = [
        TopicPerformanceResponse(
            topic_id=uuid.uuid4(),
            topic_name="Insufficient Topic",
            subject_id=uuid.uuid4(),
            accuracy=0.0,
            attempts=1
        )
    ]
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get("/api/v1/performance/me/topics")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["attempts"] == 1

@patch("app.services.performance.PerformanceService.get_strong_topics", new_callable=AsyncMock)
def test_get_strong_topics(mock_strong):
    mock_strong.return_value = [
        TopicPerformanceResponse(
            topic_id=uuid.uuid4(),
            topic_name="Strong Topic",
            subject_id=uuid.uuid4(),
            accuracy=90.0,
            attempts=4
        )
    ]
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get("/api/v1/performance/me/strong-topics")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["accuracy"] == 90.0
