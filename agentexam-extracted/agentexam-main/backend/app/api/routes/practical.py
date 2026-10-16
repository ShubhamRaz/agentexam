import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_role, SessionDep
from app.models.user import Student, RoleType
from app.schemas.practical import (
    PracticalSessionCreate,
    PracticalSessionResponse,
    PracticalSessionDetailResponse,
    PracticalSubmissionCreate,
    PracticalSubmissionResponse,
)
from app.schemas.exam import PaginatedMockTestResponse
from app.services.practical import practical_service

router = APIRouter()

@router.post("/start", response_model=PracticalSessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_practical_session(
    *,
    db: SessionDep,
    session_in: PracticalSessionCreate,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Generate a new practical session (attempt) for a subject and immediately start it.
    Assigns an experiment automatically based on the subject.
    """
    session = await practical_service.create_practical_session(db=db, student_id=current_student.id, obj_in=session_in)
    session = await practical_service.start_session(db=db, session_id=session.id, student_id=current_student.id)
    
    return PracticalSessionDetailResponse(
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
        assigned_experiments=session.experiments,
        submissions=[]
    )

@router.get("", response_model=PaginatedMockTestResponse)
async def read_practical_sessions(
    db: SessionDep,
    skip: int = 0,
    limit: int = 100,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Get all practical sessions (attempts) for the current student.
    """
    items, total = await practical_service.get_multi(db=db, student_id=current_student.id, skip=skip, limit=limit)
    return PaginatedMockTestResponse(items=items, total=total, page=skip//limit + 1 if limit > 0 else 1, size=limit)

@router.get("/{session_id}", response_model=PracticalSessionDetailResponse)
async def get_active_session(
    session_id: uuid.UUID,
    db: SessionDep,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Resume a practical session. Returns the session, assigned experiments, and already saved submissions.
    """
    session = await practical_service.get_session(db, session_id=session_id, student_id=current_student.id)
    submissions = await practical_service.get_submissions(db, session_id=session_id, student_id=current_student.id)
    
    return PracticalSessionDetailResponse(
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
        assigned_experiments=session.experiments,
        submissions=submissions
    )

@router.put("/{session_id}/submissions", response_model=PracticalSubmissionResponse)
async def save_submission(
    *,
    db: SessionDep,
    session_id: uuid.UUID,
    submission_in: PracticalSubmissionCreate,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Idempotent save for a practical experiment submission (code, text, or file reference).
    """
    submission = await practical_service.save_submission(
        db=db, 
        session_id=session_id, 
        student_id=current_student.id, 
        obj_in=submission_in
    )
    return submission

@router.post("/{session_id}/submit", response_model=PracticalSessionResponse)
async def final_submit_session(
    *,
    db: SessionDep,
    session_id: uuid.UUID,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Finalize the practical session. Locks further modifications.
    """
    session = await practical_service.submit_session(db=db, session_id=session_id, student_id=current_student.id)
    
    return PracticalSessionResponse(
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
        assigned_experiments=session.experiments
    )
