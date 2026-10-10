import pytest

@pytest.mark.asyncio
async def test_student_cannot_create(auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    response = await auth_client_student.post("/api/v1/questions", json={
        "subject_id": demo_subject_id,
        "question_type": "MCQ",
        "question_text": "Test",
        "marks": 5,
        "difficulty_level": "EASY"
    })
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_admin_can_create_and_read(auth_client_admin, auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    # Admin creates question
    response = await auth_client_admin.post("/api/v1/questions", json={
        "subject_id": demo_subject_id,
        "question_type": "MCQ",
        "question_text": "What is Python?",
        "marks": 5,
        "difficulty_level": "EASY",
        "options": [
            {"id": "A", "text": "A language", "is_correct": True},
            {"id": "B", "text": "A snake", "is_correct": False}
        ],
        "correct_answer": "A",
        "explanation": "Python is a language."
    })
    
    assert response.status_code == 201
    question_data = response.json()
    question_id = question_data["id"]
    
    assert question_data["question_text"] == "What is Python?"
    assert question_data["correct_answer"] == "A"
    assert question_data["explanation"] == "Python is a language."
    
    # Admin reads question
    response_admin = await auth_client_admin.get(f"/api/v1/questions/{question_id}")
    assert response_admin.status_code == 200
    admin_data = response_admin.json()
    assert admin_data["correct_answer"] == "A"
    assert admin_data["explanation"] == "Python is a language."
    assert "is_correct" in admin_data["options"][0]
    
    # Student reads question
    response_student = await auth_client_student.get(f"/api/v1/questions/{question_id}")
    assert response_student.status_code == 200
    student_data = response_student.json()
    assert student_data["question_text"] == "What is Python?"
    assert "correct_answer" not in student_data
    assert "explanation" not in student_data
    assert "is_correct" not in student_data["options"][0]
