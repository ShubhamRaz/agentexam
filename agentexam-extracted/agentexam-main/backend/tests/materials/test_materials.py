import pytest
import uuid
import io
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, RoleType, Admin
from app.api.deps import get_current_user, get_current_active_user
import app.models.academic as ac

import pytest
import uuid
import io

@pytest.mark.asyncio
async def test_upload_material(auth_client_admin, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    response = await auth_client_admin.post(
        "/api/v1/materials/upload",
        data={
            "title": "Test PYQ Integration",
            "material_type": "PYQ",
            "subject_id": demo_subject_id
        },
        files={"file": ("test.pdf", io.BytesIO(b"test file content"), "application/pdf")}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test PYQ Integration"
    assert data["file_type"] == "pdf"

@pytest.mark.asyncio
async def test_upload_oversized_file(auth_client_admin, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    response = await auth_client_admin.post(
        "/api/v1/materials/upload",
        data={
            "title": "Huge File",
            "material_type": "PYQ",
            "subject_id": demo_subject_id
        },
        files={"file": ("huge.pdf", io.BytesIO(b"a"), "application/pdf")},
        headers={"content-length": str(100 * 1024 * 1024)}  # 100MB
    )
    
    assert response.status_code == 413

@pytest.mark.asyncio
async def test_read_materials(auth_client_student):
    response = await auth_client_student.get("/api/v1/materials")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_upload_txt_material(auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    response = await auth_client_student.post(
        "/api/v1/materials/upload",
        data={
            "title": "Text Notes Upload",
            "material_type": "NOTES",
            "subject_id": demo_subject_id
        },
        files={"file": ("notes.txt", io.BytesIO(b"Sample plain text study notes for revision."), "text/plain")}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Text Notes Upload"
    assert data["file_type"] == "txt"

@pytest.mark.asyncio
async def test_student_material_isolation(auth_client_student, auth_client_student2, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    # Student 1 uploads a material
    upload_resp = await auth_client_student.post(
        "/api/v1/materials/upload",
        data={
            "title": "Student 1 Private Material",
            "material_type": "NOTES",
            "subject_id": demo_subject_id
        },
        files={"file": ("s1_notes.txt", io.BytesIO(b"Student 1 private content"), "text/plain")}
    )
    assert upload_resp.status_code == 201
    mat_id = upload_resp.json()["id"]

    # Student 1 can access it
    s1_get = await auth_client_student.get(f"/api/v1/materials/{mat_id}")
    assert s1_get.status_code == 200

    # Student 2 CANNOT access it
    s2_get = await auth_client_student2.get(f"/api/v1/materials/{mat_id}")
    assert s2_get.status_code == 403

    # Student 2 CANNOT download it
    s2_dl = await auth_client_student2.get(f"/api/v1/materials/{mat_id}/download")
    assert s2_dl.status_code == 403

@pytest.mark.asyncio
async def test_delete_material(auth_client_admin, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    upload_resp = await auth_client_admin.post(
        "/api/v1/materials/upload",
        data={
            "title": "Test Delete PYQ",
            "material_type": "PYQ",
            "subject_id": demo_subject_id
        },
        files={"file": ("test_del.pdf", io.BytesIO(b"content"), "application/pdf")}
    )
    assert upload_resp.status_code == 201
    material_id = upload_resp.json()["id"]
    
    response = await auth_client_admin.delete(f"/api/v1/materials/{material_id}")
    assert response.status_code == 200
