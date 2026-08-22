import pytest
from app.models.exam import ExamStatus

@pytest.mark.asyncio
async def test_viva_flow(auth_client_student, auth_client_admin, demo_subject_id, demo_student):
    if not demo_subject_id:
        pytest.skip("No demo subject found")

    # 0. Admin creates a VIVA question for the subject
    q_response = await auth_client_admin.post("/api/v1/questions", json={
        "subject_id": demo_subject_id,
        "question_text": "What is AI?",
        "question_type": "VIVA",
        "difficulty_level": "MEDIUM",
        "marks": 5.0,
        "correct_answer": "Artificial Intelligence is...",
        "options": []
    })
    assert q_response.status_code == 201

    # 1. Start VIVA session as student
    start_response = await auth_client_student.post("/api/v1/vivas/start", json={
        "subject_id": demo_subject_id,
        "duration_minutes": 30,
        "difficulty_level": "MEDIUM",
        "question_count": 1
    })
    
    assert start_response.status_code == 201
    data = start_response.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["test_type"] == "VIVA"
    
    session_id = data["id"]
    questions = data.get("questions", [])
    assert len(questions) > 0
    question_id = questions[0]["id"]
    
    # 2. Save Answer as student
    save_response = await auth_client_student.put(f"/api/v1/vivas/{session_id}/answers/{question_id}", json={
        "answer_text": "AI stands for Artificial Intelligence."
    })
    assert save_response.status_code == 200
    assert save_response.json()["answer_text"] == "AI stands for Artificial Intelligence."
    
    # 3. Submit Session as student
    submit_response = await auth_client_student.post(f"/api/v1/vivas/{session_id}/submit")
    assert submit_response.status_code == 200
    assert submit_response.json()["status"] == ExamStatus.SUBMITTED

    # 4. Evaluate Answer as admin
    eval_response = await auth_client_admin.patch(
        f"/api/v1/vivas/{session_id}/answers/{question_id}/evaluate",
        params={"student_id": str(demo_student.id)},
        json={
            "marks_obtained": 4.5,
            "feedback": "Good answer."
        }
    )
    assert eval_response.status_code == 200
    eval_data = eval_response.json()
    assert eval_data["marks_obtained"] == 4.5
    assert eval_data["feedback"] == "Good answer."
