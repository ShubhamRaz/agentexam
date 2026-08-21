import pytest
import uuid
import io
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, RoleType, Admin
from app.api.deps import get_current_user, get_current_active_user
import app.models.academic as ac

client = TestClient(app)

mock_admin_id = uuid.uuid4()
mock_admin = Admin(
    id=mock_admin_id,
    name="Admin",
    email="admin@example.com",
    role=RoleType.ADMIN,
    is_active=True,
    level="SUPER"
)

def override_get_current_admin():
    return mock_admin

@pytest.fixture(autouse=True)
def setup_auth():
    app.dependency_overrides[get_current_user] = override_get_current_admin
    app.dependency_overrides[get_current_active_user] = override_get_current_admin
    yield
    app.dependency_overrides.clear()


def test_upload_material():
    app.dependency_overrides[get_current_user] = override_get_current_admin
    
    mock_subject_id = uuid.uuid4()
    mock_material = ac.StudyMaterial(
        id=uuid.uuid4(),
        subject_id=mock_subject_id,
        uploaded_by=mock_admin_id,
        material_type="PYQ",
        title="Test PYQ",
        file_name="test.pdf",
        file_type="pdf",
        mime_type="application/pdf",
        file_size=1024,
        storage_key="test_key",
        processing_status="UPLOADED"
    )

    with patch("app.api.routes.materials.material_service.upload_material", new_callable=AsyncMock) as mock_upload:
        mock_upload.return_value = mock_material
        
        response = client.post(
            "/api/v1/materials/upload",
            data={
                "title": "Test PYQ",
                "material_type": "PYQ",
                "subject_id": str(mock_subject_id)
            },
            files={"file": ("test.pdf", io.BytesIO(b"test file content"), "application/pdf")}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Test PYQ"
        assert data["file_type"] == "pdf"


def test_upload_oversized_file():
    # Test setting a manual content-length header
    app.dependency_overrides[get_current_user] = override_get_current_admin
    mock_subject_id = uuid.uuid4()
    
    response = client.post(
        "/api/v1/materials/upload",
        data={
            "title": "Huge File",
            "material_type": "PYQ",
            "subject_id": str(mock_subject_id)
        },
        files={"file": ("huge.pdf", io.BytesIO(b"a"), "application/pdf")},
        headers={"content-length": str(100 * 1024 * 1024)}  # 100MB
    )
    
    assert response.status_code == 413


def test_read_materials():
    with patch("app.api.routes.materials.material_service.get_materials", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []
        response = client.get("/api/v1/materials")
        assert response.status_code == 200
        assert response.json() == []

def test_delete_material():
    app.dependency_overrides[get_current_user] = override_get_current_admin
    
    with patch("app.api.routes.materials.material_service.get_material", new_callable=AsyncMock) as mock_get:
        mock_material = ac.StudyMaterial(
            id=uuid.uuid4(),
            subject_id=uuid.uuid4(),
            uploaded_by=mock_admin_id,
            material_type="PYQ",
            title="Test",
            file_name="test.pdf",
            file_type="pdf",
            mime_type="application/pdf",
            file_size=1024,
            storage_key="test_key",
            processing_status="UPLOADED"
        )
        mock_get.return_value = mock_material
        
        with patch("app.api.routes.materials.material_service.delete_material", new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = True
            response = client.delete(f"/api/v1/materials/{mock_material.id}")
            assert response.status_code == 200
