import pytest
import uuid
from app.services.rag import rag_service

def test_chunk_text():
    text = "A" * 1500
    # chunk_size = 1000, overlap = 200
    chunks = rag_service.chunk_text(text)
    assert len(chunks) == 2
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 700

@pytest.mark.asyncio
async def test_search_knowledge_as_admin(auth_client_admin, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    response = await auth_client_admin.post(
        "/api/v1/knowledge/search",
        json={
            "query": "test query",
            "subject_id": demo_subject_id,
            "top_k": 5
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)

@pytest.mark.asyncio
async def test_search_knowledge_as_student(auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    response = await auth_client_student.post(
        "/api/v1/knowledge/search",
        json={
            "query": "test query",
            "subject_id": demo_subject_id,
            "top_k": 5
        }
    )
    
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to search knowledge directly."

@pytest.mark.asyncio
async def test_rag_search_uploader_scoping(db_session, demo_student, demo_student2, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    from app.models.academic import StudyMaterial, MaterialType
    import uuid
    sub_uuid = uuid.UUID(demo_subject_id)

    # Create materials for student 1 and student 2
    mat1 = StudyMaterial(
        subject_id=sub_uuid,
        uploaded_by=demo_student.id,
        material_type=MaterialType.NOTES,
        title="Student 1 Unique Notes",
        file_name="s1.txt",
        file_type="txt",
        mime_type="text/plain",
        file_size=100,
        storage_key="s1.txt",
        processing_status="PROCESSED"
    )
    mat2 = StudyMaterial(
        subject_id=sub_uuid,
        uploaded_by=demo_student2.id,
        material_type=MaterialType.NOTES,
        title="Student 2 Unique Notes",
        file_name="s2.txt",
        file_type="txt",
        mime_type="text/plain",
        file_size=100,
        storage_key="s2.txt",
        processing_status="PROCESSED"
    )
    db_session.add_all([mat1, mat2])
    await db_session.flush()

    await rag_service.index_document(db_session, mat1, "Special unique keyword for Student 1 only.")
    await rag_service.index_document(db_session, mat2, "Special unique keyword for Student 2 only.")
    await db_session.commit()

    # Search scoped to Student 1
    res1 = await rag_service.search(
        db=db_session,
        query="unique keyword",
        subject_id=sub_uuid,
        top_k=5,
        uploader_id=demo_student.id
    )
    for c in res1:
        assert c.uploaded_by == demo_student.id

    # Search scoped to Student 2
    res2 = await rag_service.search(
        db=db_session,
        query="unique keyword",
        subject_id=sub_uuid,
        top_k=5,
        uploader_id=demo_student2.id
    )
    for c in res2:
        assert c.uploaded_by == demo_student2.id

