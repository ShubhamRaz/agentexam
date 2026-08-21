from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User, RoleType
from app.api.deps import get_current_user
from app.services.plan import plan_service
from app.schemas.plan import StudyPlanResponse

router = APIRouter()

class TaskStatusUpdate(BaseModel):
    status: str

def ensure_student(user: User):
    if user.role != RoleType.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only students can access these endpoints"
        )

@router.get("/me", response_model=StudyPlanResponse)
async def get_my_study_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get the active study plan for the current student.
    If none exists, generate a new one.
    """
    ensure_student(current_user)
    plan = await plan_service.get_active_plan(db, current_user.id)
    if not plan:
        plan = await plan_service.generate_plan(db, current_user.id)
        
    # We need to map the JSON tasks back to the schema
    tasks = plan.plan_json.get("tasks", [])
    
    return StudyPlanResponse(
        id=plan.id,
        student_id=plan.student_id,
        start_date=plan.start_date,
        end_date=plan.end_date,
        status=plan.status,
        tasks=tasks
    )

@router.post("/generate", response_model=StudyPlanResponse)
async def generate_my_study_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Force-regenerate a new 7-day study plan.
    """
    ensure_student(current_user)
    plan = await plan_service.generate_plan(db, current_user.id)
    tasks = plan.plan_json.get("tasks", [])
    
    return StudyPlanResponse(
        id=plan.id,
        student_id=plan.student_id,
        start_date=plan.start_date,
        end_date=plan.end_date,
        status=plan.status,
        tasks=tasks
    )

@router.patch("/tasks/{task_id}/status")
async def update_study_task_status(
    task_id: str,
    update_data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update the status of a specific task within the active plan.
    """
    ensure_student(current_user)
    plan = await plan_service.get_active_plan(db, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active study plan found")
        
    success = await plan_service.update_task_status(db, plan.id, task_id, update_data.status)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found in active plan")
        
    return {"status": "success", "message": "Task status updated"}
