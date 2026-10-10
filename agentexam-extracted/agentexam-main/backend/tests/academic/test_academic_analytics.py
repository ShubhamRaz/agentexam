import pytest
import uuid
import io
from sqlalchemy import select
from app.models.academic import StudyMaterial, MaterialType
from app.services.processing import ProcessingOrchestrator
from app.services import academic_analytics as analytics_service

@pytest.mark.asyncio
async def test_academic_analytics_insufficient_data(db_session, demo_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    res = await analytics_service.get_topic_frequency(
        db_session, uuid.UUID(demo_subject_id), demo_student.id
    )
    # When fewer than 5 PYQs are available
    assert "sufficient_data" in res
    assert "topics" in res


@pytest.mark.asyncio
async def test_academic_analytics_with_pyqs(db_session, demo_student, demo_student2, demo_subject_id):
    from app.models.academic import Subject, Semester
    
    # Create an isolated subject for this test
    # First get a semester
    sem_res = await db_session.execute(select(Semester))
    semester = sem_res.scalars().first()
    if not semester:
        pytest.skip("No semester found in DB")
        
    test_sub = Subject(
        semester_id=semester.id,
        name=f"DBMS Analytics Test {uuid.uuid4().hex[:6]}",
        code=f"ANL-{uuid.uuid4().hex[:6]}"
    )
    db_session.add(test_sub)
    await db_session.flush()
    sub_id = test_sub.id

    # 1. Ingest Syllabus first to create units & topics
    syllabus_mat = StudyMaterial(
        subject_id=sub_id,
        uploaded_by=demo_student.id,
        material_type=MaterialType.SYLLABUS,
        title="DBMS Syllabus Test",
        file_name="syllabus.txt",
        file_type="txt",
        mime_type="text/plain",
        file_size=200,
        storage_key="test_syllabus.txt",
        processing_status="PROCESSED"
    )
    db_session.add(syllabus_mat)
    await db_session.flush()

    syllabus_data = {
        "units": [
            {"name": "Unit 1: Relational Model", "topics": ["Normalization", "Relational Algebra"]},
            {"name": "Unit 2: Transactions", "topics": ["ACID Properties", "Concurrency Control"]}
        ]
    }
    from app.services.ingestion import DataIngestionService
    ingestion = DataIngestionService(db_session)
    await ingestion._ingest_syllabus(sub_id, syllabus_data)
    await db_session.commit()

    # 2. Ingest PYQ for Student 1 with 6 questions
    pyq_mat1 = StudyMaterial(
        subject_id=sub_id,
        uploaded_by=demo_student.id,
        material_type=MaterialType.PYQ,
        title="2024 DBMS PYQ",
        file_name="pyq2024.txt",
        file_type="txt",
        mime_type="text/plain",
        file_size=500,
        storage_key="pyq2024.txt",
        processing_status="PROCESSED"
    )
    db_session.add(pyq_mat1)
    await db_session.flush()

    pyq_data1 = {
        "questions": [
            {"q_no": "1", "text": "Explain 1NF, 2NF and 3NF Normalization in detail.", "marks": 10},
            {"q_no": "2", "text": "What is normalization and why is it needed?", "marks": 5},
            {"q_no": "3", "text": "Discuss Relational Algebra operations.", "marks": 10},
            {"q_no": "4", "text": "What are ACID Properties in transactions?", "marks": 5},
            {"q_no": "5", "text": "Explain Concurrency Control protocols.", "marks": 10},
            {"q_no": "6", "text": "What is normalization and why is it needed?", "marks": 5} # duplicate question for pattern test
        ]
    }
    await ingestion._ingest_pyq(pyq_mat1, pyq_data1)
    await db_session.commit()

    # 3. Test topic & chapter frequency for Student 1
    freq = await analytics_service.get_topic_frequency(db_session, sub_id, demo_student.id)
    assert freq["sufficient_data"] is True
    assert freq["total_questions"] == 6
    assert len(freq["topics"]) > 0
    assert "units" in freq
    assert len(freq["units"]) > 0

    # 4. Test question patterns for Student 1
    patterns = await analytics_service.get_question_patterns(db_session, sub_id, demo_student.id)
    assert patterns["sufficient_data"] is True
    assert patterns["total_questions"] == 6
    assert len(patterns["marks_distribution"]) > 0
    assert len(patterns["repeated_questions"]) == 1 # 1 repeated question
    assert patterns["repeated_questions"][0]["frequency"] == 2

    # 5. Isolation: Student 2 should see insufficient data since they haven't uploaded PYQs
    s2_freq = await analytics_service.get_topic_frequency(db_session, sub_id, demo_student2.id)
    assert s2_freq["sufficient_data"] is False
