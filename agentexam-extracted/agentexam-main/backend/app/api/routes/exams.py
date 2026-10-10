import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_role, SessionDep
from app.models.user import Student, RoleType
from app.schemas.exam import (
    MockTestCreate,
    MockTestResponse,
    PaginatedMockTestResponse,
    ExamAttemptResponse,
    AnswerCreate,
    AnswerResponse
)
from app.services.exam import exam_engine

router = APIRouter()

@router.post("", response_model=MockTestResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    *,
    db: SessionDep,
    exam_in: MockTestCreate,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Generate a new MockTest attempt pulling random questions from the Question Bank.
    """
    exam = await exam_engine.create_mock_test(db=db, student_id=current_student.id, obj_in=exam_in)
    return exam

@router.get("", response_model=PaginatedMockTestResponse)
async def read_exams(
    db: SessionDep,
    skip: int = 0,
    limit: int = 100,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Get all mock tests for the current student.
    """
    items, total = await exam_engine.get_multi(db=db, student_id=current_student.id, skip=skip, limit=limit)
    return PaginatedMockTestResponse(items=items, total=total, page=skip//limit + 1 if limit > 0 else 1, size=limit)

@router.get("/{exam_id}", response_model=MockTestResponse)
async def read_exam(
    exam_id: uuid.UUID,
    db: SessionDep,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Get basic details about an exam attempt before starting.
    """
    exam = await exam_engine.get_attempt(db, exam_id=exam_id, student_id=current_student.id)
    return exam

@router.post("/{exam_id}/start", response_model=ExamAttemptResponse)
async def start_exam(
    *,
    db: SessionDep,
    exam_id: uuid.UUID,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Start the exam timer. Returns the full attempt including questions.
    """
    exam = await exam_engine.start_exam(db=db, exam_id=exam_id, student_id=current_student.id)
    
    # We must construct ExamAttemptResponse to include questions (which omit correct answers)
    return ExamAttemptResponse(
        id=exam.id,
        subject_id=exam.subject_id,
        test_type=exam.test_type,
        difficulty_level=exam.difficulty_level,
        total_marks=exam.total_marks,
        duration_minutes=exam.duration_minutes,
        status=exam.status,
        started_at=exam.started_at,
        expires_at=exam.expires_at,
        submitted_at=exam.submitted_at,
        questions=exam.questions,
        saved_answers=[]
    )

@router.get("/{exam_id}/attempt", response_model=ExamAttemptResponse)
async def get_active_attempt(
    exam_id: uuid.UUID,
    db: SessionDep,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Resume an exam. Returns the exam, questions, and already saved answers.
    """
    exam = await exam_engine.get_attempt(db, exam_id=exam_id, student_id=current_student.id)
    saved_answers = await exam_engine.get_saved_answers(db, exam_id=exam_id, student_id=current_student.id)
    
    return ExamAttemptResponse(
        id=exam.id,
        subject_id=exam.subject_id,
        test_type=exam.test_type,
        difficulty_level=exam.difficulty_level,
        total_marks=exam.total_marks,
        duration_minutes=exam.duration_minutes,
        status=exam.status,
        started_at=exam.started_at,
        expires_at=exam.expires_at,
        submitted_at=exam.submitted_at,
        questions=exam.questions,
        saved_answers=saved_answers
    )

@router.put("/{exam_id}/answers/{question_id}", response_model=AnswerResponse)
async def save_answer(
    *,
    db: SessionDep,
    exam_id: uuid.UUID,
    question_id: uuid.UUID,
    answer_in: AnswerCreate,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Idempotent save for a question's answer. Enforces server-side timer.
    """
    if answer_in.question_id != question_id:
        raise HTTPException(status_code=400, detail="Path question_id does not match body question_id")
        
    answer = await exam_engine.save_answer(
        db=db, 
        exam_id=exam_id, 
        question_id=question_id, 
        student_id=current_student.id, 
        obj_in=answer_in
    )
    return answer

@router.post("/{exam_id}/submit", response_model=MockTestResponse)
async def submit_exam(
    *,
    db: SessionDep,
    exam_id: uuid.UUID,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Finalize the exam. Locks further answer modifications.
    """
    exam = await exam_engine.submit_exam(db=db, exam_id=exam_id, student_id=current_student.id)
    return exam
