from fastapi import APIRouter
from app.api.routes import health, auth, programs, semesters, subjects, units, topics, pyqs, students, materials, questions, exams

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(semesters.router, prefix="/semesters", tags=["semesters"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(units.router, prefix="/units", tags=["units"])
api_router.include_router(topics.router, prefix="/topics", tags=["topics"])
api_router.include_router(pyqs.router, prefix="/pyqs", tags=["pyqs"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
