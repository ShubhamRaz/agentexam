import pytest
from app.schemas.readiness import ReadinessStatus

@pytest.mark.asyncio
async def test_get_my_readiness_strong_student(auth_client_student):
    response = await auth_client_student.get("/api/v1/performance/me/readiness")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "readiness_score" in data
    assert "risk_areas" in data
    assert "recommendations" in data

@pytest.mark.asyncio
async def test_get_my_readiness_avg_student(auth_client_student2):
    response = await auth_client_student2.get("/api/v1/performance/me/readiness")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "readiness_score" in data

def test_get_my_readiness_admin_forbidden(auth_client_admin):
    # This might need to be async if auth_client_admin is async generator or client fixture
    pass

@pytest.mark.asyncio
async def test_get_my_readiness_admin_forbidden_async(auth_client_admin):
    response = await auth_client_admin.get("/api/v1/performance/me/readiness")
    assert response.status_code == 403
    assert response.json()["detail"] == "Only students can access these performance endpoints"
