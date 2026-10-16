import uuid
from typing import Any
from fastapi import APIRouter, Depends, status

from app.api.deps import require_role, SessionDep
from app.models.user import Student, RoleType
from app.schemas.result import ResultResponse, ResultDetailResponse, PaginatedResultResponse
from app.services.evaluation import evaluation_service

router = APIRouter()

@router.post("/exams/{exam_id}/evaluate", response_model=ResultResponse, status_code=status.HTTP_201_CREATED)
async def evaluate_exam(
    *,
    db: SessionDep,
    exam_id: uuid.UUID,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Trigger evaluation for a submitted exam attempt.
    """
    result = await evaluation_service.evaluate_exam(db=db, exam_id=exam_id, student_id=current_student.id)
    return result

@router.get("/exams/{exam_id}/result", response_model=ResultDetailResponse)
async def get_exam_result(
    exam_id: uuid.UUID,
    db: SessionDep,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Get detailed result for a specific exam attempt (including question breakdown and correct answers).
    """
    data = await evaluation_service.get_detailed_result(db=db, exam_id=exam_id, student_id=current_student.id)
    return data

@router.get("", response_model=PaginatedResultResponse)
async def read_results(
    db: SessionDep,
    skip: int = 0,
    limit: int = 100,
    current_student: Student = Depends(require_role([RoleType.STUDENT]))
) -> Any:
    """
    Get all results for the current student.
    """
    items, total = await evaluation_service.get_multi(db=db, student_id=current_student.id, skip=skip, limit=limit)
    return PaginatedResultResponse(items=items, total=total, page=skip//limit + 1 if limit > 0 else 1, size=limit)
