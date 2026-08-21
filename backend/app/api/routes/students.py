from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import SessionDep, get_current_user
from app.models.user import User, Student
from app.schemas.academic import StudentProfileResponse, SemesterResponse
from app.services import academic as academic_service

router = APIRouter()

@router.get("/me", response_model=StudentProfileResponse)
async def read_student_profile(
    db: SessionDep,
    current_user: User = Depends(get_current_user),
) -> Any:
    """ Retrieve current student profile. """
    # Based on the user model, a User is a generic user, but it could be a Student instance
    # if it was created as one due to polymorphic mapping.
    if not isinstance(current_user, Student):
        # We can still return the profile even for Teacher/Admin by mapping common fields
        return {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
        }
    
    return current_user

@router.get("/me/semester", response_model=str)
async def read_student_semester(
    db: SessionDep,
    current_user: User = Depends(get_current_user),
) -> Any:
    """ Get the current semester for the student. """
    if not isinstance(current_user, Student):
        raise HTTPException(status_code=403, detail="Not a student")
    
    if not current_user.semester:
        raise HTTPException(status_code=404, detail="Semester not assigned for student")
        
    return current_user.semester
