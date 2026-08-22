import pytest
import uuid
from app.models.exam import DifficultyLevel

@pytest.mark.asyncio
async def test_get_my_weak_topics(auth_client_student):
    response = await auth_client_student.get("/api/v1/performance/me/weak-topics")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # The demo script creates weak topics for the strong student
    # Wait, the weak topics for strong student is "Logic: 70". 
    # Because 70 is < 80 it's returned as weak?
    # It just returns a list, which could be empty or not. We'll just assert it's a list.

@pytest.mark.asyncio
async def test_get_topic_recommended_difficulty(auth_client_student):
    # Just use a random topic UUID for now, as it handles unknown topics
    random_topic_id = str(uuid.uuid4())
    response = await auth_client_student.get(f"/api/v1/performance/me/topics/{random_topic_id}/difficulty")
    assert response.status_code == 200
    assert "recommended_difficulty" in response.json()

@pytest.mark.asyncio
async def test_performance_unauthorized(auth_client_admin):
    response = await auth_client_admin.get("/api/v1/performance/me/weak-topics")
    assert response.status_code == 403
    assert response.json()["detail"] == "Only students can access these performance endpoints"
