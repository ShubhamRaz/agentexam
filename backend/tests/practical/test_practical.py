import pytest
import uuid
from app.models.exam import ExamStatus

@pytest.mark.asyncio
async def test_practical_flow(auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    # 1. Start practical session
    start_response = await auth_client_student.post("/api/v1/practical/start", json={
        "subject_id": demo_subject_id,
        "duration_minutes": 120,
        "difficulty_level": "MEDIUM"
    })
    
    assert start_response.status_code == 201
    data = start_response.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["test_type"] == "PRACTICAL"
    
    session_id = data["id"]
    experiments = data.get("assigned_experiments", [])
    
    if not experiments:
        pytest.skip("No experiments seeded for demo subject")
        
    exp_id = experiments[0]["id"]
    
    # 2. Save submission
    save_response = await auth_client_student.put(f"/api/v1/practical/{session_id}/submissions", json={
        "experiment_id": exp_id,
        "answer_text": "Step 1, Step 2"
    })
    
    assert save_response.status_code == 200
    save_data = save_response.json()
    assert save_data["answer_text"] == "Step 1, Step 2"
    
    # 3. Submit session
    submit_response = await auth_client_student.post(f"/api/v1/practical/{session_id}/submit")
    assert submit_response.status_code == 200
    assert submit_response.json()["status"] == ExamStatus.SUBMITTED
