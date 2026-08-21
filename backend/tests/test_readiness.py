import pytest
import uuid
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import User, RoleType
from app.api.deps import get_current_user
from app.schemas.performance import PerformanceOverviewResponse, TopicPerformanceResponse
from app.schemas.readiness import ReadinessStatus

client = TestClient(app)

mock_student_id = uuid.uuid4()
mock_topic_id_1 = uuid.uuid4()
mock_topic_id_2 = uuid.uuid4()

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
        id=uuid.uuid4(),
        name="Admin",
        email="admin@test.com",
        password_hash="hash",
        role=RoleType.ADMIN,
        is_active=True
    )

@patch("app.services.performance.PerformanceService.get_performance_overview", new_callable=AsyncMock)
@patch("app.services.performance.PerformanceService.get_topic_performance", new_callable=AsyncMock)
def test_get_my_readiness_insufficient_data(mock_topics, mock_overview):
    # Total attempts = 3 (less than MINIMUM_READINESS_ATTEMPTS which is 5)
    mock_topics.return_value = [
        TopicPerformanceResponse(
            topic_id=mock_topic_id_1,
            topic_name="Topic 1",
            subject_id=uuid.uuid4(),
            accuracy=50.0,
            attempts=3
        )
    ]
    mock_overview.return_value = PerformanceOverviewResponse(
        overall_accuracy=50.0,
        strong_topics=[],
        weak_topics=[],
        insufficient_data_topics=[]
    )
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get("/api/v1/performance/me/readiness")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == ReadinessStatus.INSUFFICIENT_DATA
    assert data["readiness_score"] is None
    assert len(data["recommendations"]) == 1
    assert "Attempt more assessments" in data["recommendations"][0]["message"]

@patch("app.services.performance.PerformanceService.get_performance_overview", new_callable=AsyncMock)
@patch("app.services.performance.PerformanceService.get_topic_performance", new_callable=AsyncMock)
def test_get_my_readiness_high_performance(mock_topics, mock_overview):
    # Total attempts = 10 (>= 5)
    mock_topics.return_value = [
        TopicPerformanceResponse(
            topic_id=mock_topic_id_1,
            topic_name="Topic 1",
            subject_id=uuid.uuid4(),
            accuracy=80.0,
            attempts=10
        )
    ]
    mock_overview.return_value = PerformanceOverviewResponse(
        overall_accuracy=80.0,
        strong_topics=[],
        weak_topics=[],
        insufficient_data_topics=[]
    )
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get("/api/v1/performance/me/readiness")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == ReadinessStatus.HIGH
    assert data["readiness_score"] == 80.0
    assert len(data["risk_areas"]) == 0
    assert len(data["recommendations"]) == 0

@patch("app.services.performance.PerformanceService.get_performance_overview", new_callable=AsyncMock)
@patch("app.services.performance.PerformanceService.get_topic_performance", new_callable=AsyncMock)
def test_get_my_readiness_with_risks(mock_topics, mock_overview):
    # Total attempts = 10 (>= 5)
    t_perf = TopicPerformanceResponse(
        topic_id=mock_topic_id_1,
        topic_name="Weak Topic",
        subject_id=uuid.uuid4(),
        accuracy=30.0,
        attempts=10
    )
    mock_topics.return_value = [t_perf]
    mock_overview.return_value = PerformanceOverviewResponse(
        overall_accuracy=30.0,
        strong_topics=[],
        weak_topics=[t_perf],
        insufficient_data_topics=[]
    )
    
    app.dependency_overrides[get_current_user] = override_get_current_student
    response = client.get("/api/v1/performance/me/readiness")
    app.dependency_overrides.clear()
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == ReadinessStatus.LOW
    assert data["readiness_score"] == 30.0
    assert len(data["risk_areas"]) == 1
    assert data["risk_areas"][0]["risk_level"] == "HIGH"
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["priority"] == "HIGH"
    
def test_get_my_readiness_admin_forbidden():
    app.dependency_overrides[get_current_user] = override_get_current_admin
    response = client.get("/api/v1/performance/me/readiness")
    app.dependency_overrides.clear()
    
    assert response.status_code == 403
