from fastapi import APIRouter
from app.api.routes import health, auth, programs, semesters, subjects, units, topics, pyqs, students, materials, questions, exams, results, practical, viva, ai, knowledge, chat, performance

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(programs.router, prefix="/programs", tags=["academic"])
api_router.include_router(semesters.router, prefix="/semesters", tags=["academic"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["academic"])
api_router.include_router(units.router, prefix="/units", tags=["academic"])
api_router.include_router(topics.router, prefix="/topics", tags=["academic"])
api_router.include_router(pyqs.router, prefix="/pyqs", tags=["materials"])
api_router.include_router(students.router, prefix="/students", tags=["users"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(results.router, prefix="/results", tags=["results"])
api_router.include_router(practical.router, prefix="/practical", tags=["practical"])
api_router.include_router(viva.router, prefix="/vivas", tags=["vivas"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(chat.router, prefix="/ai/chat", tags=["chat"])
api_router.include_router(performance.router, prefix="/performance", tags=["performance"])
from app.api.routes import plan
api_router.include_router(plan.router, prefix="/study-plan", tags=["study_plan"])
# Task 3 — Academic data analytics
from app.api.routes import academic_analytics
api_router.include_router(academic_analytics.router, prefix="/academic-analytics", tags=["academic_analytics"])
