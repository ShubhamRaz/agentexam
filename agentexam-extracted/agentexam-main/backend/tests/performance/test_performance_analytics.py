import pytest
import uuid

@pytest.mark.asyncio
async def test_get_my_performance_overview(auth_client_student):
    response = await auth_client_student.get("/api/v1/performance/me")
    assert response.status_code == 200
    data = response.json()
    assert "overall_accuracy" in data
    assert "strong_topics" in data
    assert "weak_topics" in data

@pytest.mark.asyncio
async def test_get_topics_performance(auth_client_student):
    response = await auth_client_student.get("/api/v1/performance/me/topics")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_strong_topics(auth_client_student):
    response = await auth_client_student.get("/api/v1/performance/me/strong-topics")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
