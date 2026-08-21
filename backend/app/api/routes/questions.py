import uuid
from typing import Any, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_active_user, require_role, SessionDep
from app.models.user import RoleType
from app.models.exam import QuestionType, DifficultyLevel, QuestionSource, QuestionStatus
from app.schemas.question import (
    QuestionCreate, 
    QuestionUpdate, 
    QuestionResponseAdmin, 
    QuestionResponseStudent,
    PaginatedQuestionResponseAdmin,
    PaginatedQuestionResponseStudent
)
from app.services.question import question_service

router = APIRouter()

@router.post("", response_model=QuestionResponseAdmin, status_code=status.HTTP_201_CREATED)
async def create_question(
    *,
    db: SessionDep,
    question_in: QuestionCreate,
    current_user: Any = Depends(require_role([RoleType.ADMIN, RoleType.TEACHER]))
) -> Any:
    """
    Create new question (Admin/Teacher only).
    """
    question = await question_service.create(db=db, obj_in=question_in, user_id=current_user.id)
    return question

@router.get("", response_model=Union[PaginatedQuestionResponseAdmin, PaginatedQuestionResponseStudent])
async def read_questions(
    db: SessionDep,
    skip: int = 0,
    limit: int = 100,
    subject_id: Optional[uuid.UUID] = None,
    chapter_id: Optional[uuid.UUID] = None,
    topic_id: Optional[uuid.UUID] = None,
    difficulty_level: Optional[DifficultyLevel] = None,
    question_type: Optional[QuestionType] = None,
    source: Optional[QuestionSource] = None,
    question_status: Optional[QuestionStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: Any = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve questions. 
    Students get a stripped-down version (no correct answers).
    Admins/Teachers get the full version.
    """
    # Force ACTIVE status for students to prevent them from seeing drafts/archived/review_required
    if current_user.role == RoleType.STUDENT:
        question_status = QuestionStatus.ACTIVE
        
    items, total = await question_service.get_multi(
        db, 
        skip=skip, 
        limit=limit,
        subject_id=subject_id,
        chapter_id=chapter_id,
        topic_id=topic_id,
        difficulty_level=difficulty_level,
        question_type=question_type,
        source=source,
        status=question_status,
        search=search
    )
    
    if current_user.role in [RoleType.ADMIN, RoleType.TEACHER]:
        return PaginatedQuestionResponseAdmin(items=items, total=total, page=skip//limit + 1 if limit > 0 else 1, size=limit)
    else:
        return PaginatedQuestionResponseStudent(items=items, total=total, page=skip//limit + 1 if limit > 0 else 1, size=limit)

@router.get("/{question_id}", response_model=Union[QuestionResponseAdmin, QuestionResponseStudent])
async def read_question(
    question_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_active_user)
) -> Any:
    """
    Get a specific question by ID.
    Students get a stripped-down version.
    """
    question = await question_service.get(db, id=question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if current_user.role == RoleType.STUDENT and question.status != QuestionStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Not authorized to view this question")
        
    if current_user.role in [RoleType.ADMIN, RoleType.TEACHER]:
        return QuestionResponseAdmin.from_orm(question)
    else:
        return QuestionResponseStudent.from_orm(question)

@router.patch("/{question_id}", response_model=QuestionResponseAdmin)
async def update_question(
    *,
    db: SessionDep,
    question_id: uuid.UUID,
    question_in: QuestionUpdate,
    current_user: Any = Depends(require_role([RoleType.ADMIN, RoleType.TEACHER]))
) -> Any:
    """
    Update a question (Admin/Teacher only).
    """
    question = await question_service.get(db, id=question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    question = await question_service.update(db=db, db_obj=question, obj_in=question_in)
    return question

@router.patch("/{question_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_question(
    *,
    db: SessionDep,
    question_id: uuid.UUID,
    current_user: Any = Depends(require_role([RoleType.ADMIN, RoleType.TEACHER]))
) -> None:
    """
    Archive a question instead of hard deletion (Admin/Teacher only).
    """
    question = await question_service.get(db, id=question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    success = await question_service.archive(db=db, id=question_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to archive question")
