import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_role, SessionDep
from app.models.user import Student, User, RoleType
from app.schemas.viva import (
    VivaSessionCreate,
    VivaSessionResponse,
    VivaSessionDetailResponse,
    VivaAnswerCreate,
    VivaAnswerResponse,
    VivaEvaluationUpdate,
    VivaEvaluationResponse
)
from app.schemas.exam import PaginatedMockTestResponse
from app.services.viva import viva_service

router = APIRouter()

@router.post("/start", response_model=VivaSessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_viva_session(
    *,
    db: SessionDep,
    session_in: VivaSessionCreate,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Generate a new viva session for a subject and immediately start it.
    Assigns questions automatically based on the subject and VIVA question type.
    """
    session = await viva_service.create_viva_session(db=db, student_id=current_student.id, obj_in=session_in)
    session = await viva_service.start_session(db=db, session_id=session.id, student_id=current_student.id)
    
    return VivaSessionDetailResponse(
        id=session.id,
        subject_id=session.subject_id,
        test_type=session.test_type,
        difficulty_level=session.difficulty_level,
        total_marks=session.total_marks,
        duration_minutes=session.duration_minutes,
        status=session.status,
        started_at=session.started_at,
        expires_at=session.expires_at,
        submitted_at=session.submitted_at,
        questions=session.questions,
        saved_answers=[]
    )

@router.get("", response_model=PaginatedMockTestResponse)
async def read_viva_sessions(
    db: SessionDep,
    skip: int = 0,
    limit: int = 100,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Get all viva sessions (attempts) for the current student.
    """
    items, total = await viva_service.get_multi(db=db, student_id=current_student.id, skip=skip, limit=limit)
    return PaginatedMockTestResponse(items=items, total=total, page=skip//limit + 1 if limit > 0 else 1, size=limit)

@router.get("/{session_id}", response_model=VivaSessionDetailResponse)
async def get_active_session(
    session_id: uuid.UUID,
    db: SessionDep,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Resume a viva session. Returns the session, assigned questions, and already saved answers.
    """
    session = await viva_service.get_session(db, session_id=session_id, student_id=current_student.id)
    answers = await viva_service.get_saved_answers(db, session_id=session_id, student_id=current_student.id)
    
    return VivaSessionDetailResponse(
        id=session.id,
        subject_id=session.subject_id,
        test_type=session.test_type,
        difficulty_level=session.difficulty_level,
        total_marks=session.total_marks,
        duration_minutes=session.duration_minutes,
        status=session.status,
        started_at=session.started_at,
        expires_at=session.expires_at,
        submitted_at=session.submitted_at,
        questions=session.questions,
        saved_answers=answers
    )

@router.put("/{session_id}/answers/{question_id}", response_model=VivaAnswerResponse)
async def save_answer(
    *,
    db: SessionDep,
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    answer_in: VivaAnswerCreate,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Idempotent save for a viva answer text.
    """
    answer = await viva_service.save_answer(
        db=db, 
        session_id=session_id, 
        question_id=question_id,
        student_id=current_student.id, 
        obj_in=answer_in
    )
    return answer

@router.post("/{session_id}/submit", response_model=VivaSessionResponse)
async def final_submit_session(
    *,
    db: SessionDep,
    session_id: uuid.UUID,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Finalize the viva session. Locks further modifications.
    """
    session = await viva_service.submit_session(db=db, session_id=session_id, student_id=current_student.id)
    
    return session

@router.patch("/{session_id}/answers/{question_id}/evaluate", response_model=VivaEvaluationResponse)
async def evaluate_answer(
    *,
    db: SessionDep,
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    student_id: uuid.UUID,  # Needed to locate the specific student's attempt if examiner is acting
    evaluation_in: VivaEvaluationUpdate,
    current_user: User = Depends(require_role([RoleType.ADMIN, RoleType.TEACHER]))
) -> Any:
    """
    Provide manual evaluation marks and feedback for a student's answer.
    """
    evaluation = await viva_service.evaluate_answer(
        db=db,
        session_id=session_id,
        question_id=question_id,
        student_id=student_id,
        evaluator_id=current_user.id,
        obj_in=evaluation_in
    )
    return evaluation
