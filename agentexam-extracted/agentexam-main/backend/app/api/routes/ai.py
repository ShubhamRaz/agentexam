import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User, RoleType
from app.api.deps import get_current_user
from app.schemas.ai import AIGenerationRequest, AIGenerationJobResponse
from app.services.ai import ai_service

router = APIRouter()


@router.post("/questions/generate", response_model=AIGenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_questions(
    request: AIGenerationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate questions using AI. Only allowed for TEACHER and ADMIN roles.
    This triggers a background job and returns the job status.
    """
    if current_user.role not in [RoleType.TEACHER, RoleType.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can generate AI questions"
        )
        
    job = await ai_service.create_generation_job(db=db, request=request, user_id=current_user.id)
    
    # Trigger background task
    background_tasks.add_task(ai_service.run_generation_task, job_id=job.id)
    
    return AIGenerationJobResponse.model_validate(job)


@router.get("/questions/generation/{job_id}", response_model=AIGenerationJobResponse)
async def get_generation_job_status(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check the status of an AI question generation job.
    """
    if current_user.role not in [RoleType.TEACHER, RoleType.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can view generation jobs"
        )
        
    job = await ai_service.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI Generation job not found"
        )
        
    return AIGenerationJobResponse.model_validate(job)
