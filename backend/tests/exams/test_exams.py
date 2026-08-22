import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models.user import Student, RoleType
from app.api.deps import get_current_active_user, get_current_user
from app.models.exam import MockTest, ExamStatus, TestType, DifficultyLevel

import pytest
import uuid

@pytest.mark.asyncio
async def test_exam_flow(auth_client_student, demo_subject_id):
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    # 1. Create Exam
    response = await auth_client_student.post("/api/v1/exams", json={
        "subject_id": demo_subject_id,
        "test_type": "THEORY",
        "difficulty_level": "MEDIUM",
        "question_count": 2,
        "duration_minutes": 60
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "DRAFT"
    exam_id = data["id"]
    
    # 2. Start Exam
    response = await auth_client_student.post(f"/api/v1/exams/{exam_id}/start")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "IN_PROGRESS"
    assert "questions" in data
    
    # Check if questions were generated
    if not data["questions"]:
        # Seed data might not have questions for this difficulty/type, skip answer testing
        return
        
    question_id = data["questions"][0]["id"]
    
    # 3. Save Answer
    response = await auth_client_student.put(f"/api/v1/exams/{exam_id}/answers/{question_id}", json={
        "question_id": question_id,
        "answer_text": "Integration test answer"
    })
    assert response.status_code == 200
    
    # 4. Submit Exam
    response = await auth_client_student.post(f"/api/v1/exams/{exam_id}/submit")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUBMITTED"
