import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

# Add backend to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text

from app.db.session import AsyncSessionLocal
from app.db.base_class import Base
from app.core.security import get_password_hash
from app.models.user import User, Student, Teacher, Admin, RoleType
from app.models.academic import Course, Semester, Subject, Chapter, Topic, StudyMaterial, MaterialAnalysis, MaterialType
from app.models.exam import MockTest, Question, Answer, Evaluation, Result, ResultAnalytics, TestType, DifficultyLevel, ExamStatus, QuestionType, QuestionStatus
from app.models.plan import StudyPlan, Recommendation, PlanStatus, RecommendationType, RecommendationPriority
from app.models.practical import Experiment, PracticalSubmission, PracticalEvaluation

async def clean_demo_data(session: AsyncSession):
    print("Cleaning existing demo data...")
    # 1. Identify demo users
    demo_users_query = await session.execute(select(User).where(User.email.like("demo.%")))
    demo_users = demo_users_query.scalars().all()
    demo_user_ids = [u.id for u in demo_users]
    
    # 2. Identify demo courses
    demo_courses_query = await session.execute(select(Course).where(Course.code.like("DEMO-%")))
    demo_courses = demo_courses_query.scalars().all()
    demo_course_ids = [c.id for c in demo_courses]

    demo_subjects = []
    if demo_course_ids:
        demo_semesters = (await session.execute(select(Semester.id).where(Semester.course_id.in_(demo_course_ids)))).scalars().all()
        if demo_semesters:
            demo_subjects = (await session.execute(select(Subject.id).where(Subject.semester_id.in_(demo_semesters)))).scalars().all()

    # 3. Delete dependent data first
    if demo_user_ids:
        await session.execute(delete(ResultAnalytics).where(ResultAnalytics.result_id.in_(
            select(Result.id).where(Result.student_id.in_(demo_user_ids))
        )))
        await session.execute(delete(Result).where(Result.student_id.in_(demo_user_ids)))
        await session.execute(delete(Evaluation).where(Evaluation.answer_id.in_(
            select(Answer.id).where(Answer.student_id.in_(demo_user_ids))
        )))
        await session.execute(delete(Answer).where(Answer.student_id.in_(demo_user_ids)))
        await session.execute(delete(PracticalEvaluation).where(PracticalEvaluation.submission_id.in_(
            select(PracticalSubmission.id).where(PracticalSubmission.student_id.in_(demo_user_ids))
        )))
        await session.execute(delete(PracticalSubmission).where(PracticalSubmission.student_id.in_(demo_user_ids)))
        
        mock_test_ids = (await session.execute(select(MockTest.id).where(MockTest.student_id.in_(demo_user_ids)))).scalars().all()
        if mock_test_ids:
            # Delete mock test questions
            for mt_id in mock_test_ids:
                await session.execute(text(f"DELETE FROM mock_test_question WHERE test_id = '{mt_id}'"))
            # Delete mock test experiments
            for mt_id in mock_test_ids:
                await session.execute(text(f"DELETE FROM mock_test_experiment WHERE test_id = '{mt_id}'"))
                
        await session.execute(delete(MockTest).where(MockTest.student_id.in_(demo_user_ids)))
        
        await session.execute(delete(Recommendation).where(Recommendation.plan_id.in_(
            select(StudyPlan.id).where(StudyPlan.student_id.in_(demo_user_ids))
        )))
        await session.execute(delete(StudyPlan).where(StudyPlan.student_id.in_(demo_user_ids)))
        
        # Delete questions created by demo admin
        await session.execute(delete(Question).where(Question.created_by.in_(demo_user_ids)))

    if demo_subjects:
        demo_materials = (await session.execute(select(StudyMaterial.id).where(StudyMaterial.subject_id.in_(demo_subjects)))).scalars().all()
        if demo_materials:
            await session.execute(delete(MaterialAnalysis).where(MaterialAnalysis.material_id.in_(demo_materials)))
            await session.execute(delete(StudyMaterial).where(StudyMaterial.id.in_(demo_materials)))

    # 4. Now safe to delete Users
    if demo_user_ids:
        await session.execute(delete(Student).where(Student.id.in_(demo_user_ids)))
        await session.execute(delete(Admin).where(Admin.id.in_(demo_user_ids)))
        await session.execute(delete(Teacher).where(Teacher.id.in_(demo_user_ids)))
        await session.execute(delete(User).where(User.id.in_(demo_user_ids)))

    # 5. Now safe to delete Academic Data
    if demo_course_ids:
        if demo_semesters:
            if demo_subjects:
                demo_chapters = (await session.execute(select(Chapter.id).where(Chapter.subject_id.in_(demo_subjects)))).scalars().all()
                if demo_chapters:
                    await session.execute(delete(Topic).where(Topic.chapter_id.in_(demo_chapters)))
                
                await session.execute(delete(Question).where(Question.subject_id.in_(demo_subjects)))
                await session.execute(delete(Experiment).where(Experiment.subject_id.in_(demo_subjects)))
                
                await session.execute(delete(Chapter).where(Chapter.subject_id.in_(demo_subjects)))
                
            await session.execute(delete(Subject).where(Subject.semester_id.in_(demo_semesters)))
        await session.execute(delete(Semester).where(Semester.course_id.in_(demo_course_ids)))
        await session.execute(delete(Course).where(Course.id.in_(demo_course_ids)))

    await session.commit()
    print("Cleanup complete.")

async def seed_demo_data(session: AsyncSession):
    print("Creating academic hierarchy...")
    
    # 1. Admin/Teacher
    admin = Admin(
        name="Demo Admin",
        email="demo.admin@example.com",
        password_hash=get_password_hash("demopassword"),
        role=RoleType.ADMIN,
        level="SUPER"
    )
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    
    # 2. Course
    course = Course(
        name="DEMO B.Tech Computer Science & Engineering",
        code="DEMO-BTECH-CSE",
        description="Demo course for testing"
    )
    session.add(course)
    await session.commit()
    await session.refresh(course)
    
    # 3. Semester
    semester = Semester(
        course_id=course.id,
        semester_number=6,
        name="Semester 6"
    )
    session.add(semester)
    await session.commit()
    await session.refresh(semester)
    
    # 4. Subjects
    subjects = [
        Subject(semester_id=semester.id, name="Artificial Intelligence", code="CS601", description="Demo AI"),
        Subject(semester_id=semester.id, name="Database Management Systems", code="CS602", description="Demo DBMS"),
        Subject(semester_id=semester.id, name="Computer Networks", code="CS603", description="Demo CN")
    ]
    session.add_all(subjects)
    await session.commit()
    for s in subjects:
        await session.refresh(s)
        
    subject_ai = subjects[0]
    subject_dbms = subjects[1]
    
    # 5. Units & Topics
    ai_chapters = [
        Chapter(subject_id=subject_ai.id, name="Introduction to AI", chapter_no=1),
        Chapter(subject_id=subject_ai.id, name="Search Algorithms", chapter_no=2),
        Chapter(subject_id=subject_ai.id, name="Knowledge Representation", chapter_no=3)
    ]
    session.add_all(ai_chapters)
    await session.commit()
    for c in ai_chapters:
        await session.refresh(c)
        
    ai_topics = [
        Topic(chapter_id=ai_chapters[0].id, name="Intelligent Agents"),
        Topic(chapter_id=ai_chapters[0].id, name="Problem Solving"),
        Topic(chapter_id=ai_chapters[1].id, name="BFS"),
        Topic(chapter_id=ai_chapters[1].id, name="DFS"),
        Topic(chapter_id=ai_chapters[2].id, name="Logic"),
        Topic(chapter_id=ai_chapters[2].id, name="Inference")
    ]
    session.add_all(ai_topics)
    await session.commit()
    
    # 6. Students
    print("Creating demo students...")
    students = [
        Student(
            name="Strong Student",
            email="demo.student1@example.com",
            password_hash=get_password_hash("demopass"),
            enrollment_no="DEMO1001",
            semester="6",
            department="CSE"
        ),
        Student(
            name="Average Student",
            email="demo.student2@example.com",
            password_hash=get_password_hash("demopass"),
            enrollment_no="DEMO1002",
            semester="6",
            department="CSE"
        ),
        Student(
            name="Weak Student",
            email="demo.student3@example.com",
            password_hash=get_password_hash("demopass"),
            enrollment_no="DEMO1003",
            semester="6",
            department="CSE"
        ),
        Student(
            name="New Student",
            email="demo.newstudent@example.com",
            password_hash=get_password_hash("demopass"),
            enrollment_no="DEMO1004",
            semester="6",
            department="CSE"
        )
    ]
    session.add_all(students)
    await session.commit()
    for s in students:
        await session.refresh(s)
        
    student_strong = students[0]
    student_avg = students[1]
    student_weak = students[2]
    student_new = students[3]
    
    # 7. Questions
    print("Creating questions and PYQs...")
    questions = []
    # AI questions
    for i in range(10):
        q = Question(
            subject_id=subject_ai.id,
            chapter_id=ai_chapters[0].id,
            question_type=QuestionType.MCQ,
            question_text=f"[DEMO] AI Question {i+1} on Intelligent Agents",
            options=[
                {"id": "A", "text": "Option 1", "is_correct": True},
                {"id": "B", "text": "Option 2", "is_correct": False},
                {"id": "C", "text": "Option 3", "is_correct": False},
                {"id": "D", "text": "Option 4", "is_correct": False}
            ],
            correct_answer="A",
            marks=1.0,
            difficulty_level=DifficultyLevel.MEDIUM,
            created_by=admin.id
        )
        questions.append(q)
    
    # PYQs
    for i in range(5):
        pyq = Question(
            subject_id=subject_ai.id,
            chapter_id=ai_chapters[1].id,
            question_type=QuestionType.SHORT_ANSWER,
            question_text=f"[DEMO PYQ] Explain Search Algorithm {i+1}",
            correct_answer="Explanation here...",
            marks=5.0,
            difficulty_level=DifficultyLevel.HARD,
            source="PYQ",
            source_reference=f"202{i} Term Exam",
            created_by=admin.id
        )
        questions.append(pyq)
        
    session.add_all(questions)
    await session.commit()
    for q in questions:
        await session.refresh(q)
        
    # 8. Exams, Attempts, Results (Creating history for A, B, C)
    print("Creating exam attempts and results...")
    
    def create_mock_test(student_id, marks_percent, readiness):
        mt = MockTest(
            student_id=student_id,
            subject_id=subject_ai.id,
            test_type=TestType.THEORY,
            difficulty_level=DifficultyLevel.MEDIUM,
            total_marks=20,
            duration_minutes=60,
            status=ExamStatus.EVALUATED,
            started_at=datetime.utcnow() - timedelta(days=2),
            submitted_at=datetime.utcnow() - timedelta(days=2, hours=-1)
        )
        session.add(mt)
        return mt, marks_percent, readiness

    test_data = [
        create_mock_test(student_strong.id, 95.0, 9.2),
        create_mock_test(student_avg.id, 65.0, 6.0),
        create_mock_test(student_weak.id, 35.0, 3.5)
    ]
    
    await session.commit()
    for mt, _, _ in test_data:
        await session.refresh(mt)
        
    results = []
    analytics = []
    
    for mt, percent, readiness in test_data:
        obtained = (percent / 100.0) * mt.total_marks
        res = Result(
            test_id=mt.id,
            student_id=mt.student_id,
            total_marks=mt.total_marks,
            obtained_marks=obtained,
            percentage=percent,
            pass_status=percent >= 40.0,
            readiness_score=readiness
        )
        session.add(res)
        results.append((res, percent))
        
    await session.commit()
    for res, _ in results:
        await session.refresh(res)
        
    for res, percent in results:
        if percent >= 90:
            strong = {"Intelligent Agents": 95, "Search Algorithms": 90}
            weak = {"Logic": 70}
        elif percent >= 60:
            strong = {"Intelligent Agents": 75}
            weak = {"Logic": 40, "Inference": 45}
        else:
            strong = {}
            weak = {"Intelligent Agents": 30, "Search Algorithms": 20, "Logic": 10}
            
        an = ResultAnalytics(
            result_id=res.id,
            topic_strength=strong,
            weak_areas=weak,
            improvement_suggestions="[DEMO] Focus on weak topics.",
            recommended_topics=weak
        )
        session.add(an)
    await session.commit()
    
    # 9. Materials
    print("Creating demo materials...")
    mat = StudyMaterial(
        subject_id=subject_ai.id,
        uploaded_by=admin.id,
        material_type=MaterialType.NOTES,
        title="[DEMO] AI Unit 1 Notes",
        file_name="demo_ai_unit1.pdf",
        file_type="pdf",
        mime_type="application/pdf",
        file_size=1024,
        storage_key="demo/ai_unit1.pdf",
        processing_status="COMPLETED"
    )
    session.add(mat)
    await session.commit()
    
    # 10. Practical
    print("Creating practical experiments...")
    exp = Experiment(
        subject_id=subject_ai.id,
        title="[DEMO] Implement BFS",
        description="Write a python program to implement BFS",
        marks=10.0
    )
    session.add(exp)
    await session.commit()
    
    # 11. Study Plans
    print("Creating study plans...")
    for student, level in [(student_strong, "HIGH"), (student_avg, "MEDIUM"), (student_weak, "LOW")]:
        sp = StudyPlan(
            student_id=student.id,
            start_date=datetime.utcnow().date(),
            end_date=(datetime.utcnow() + timedelta(days=7)).date(),
            plan_json={"title": f"Weekly Plan ({level})"},
            status=PlanStatus.ACTIVE
        )
        session.add(sp)
        await session.commit()
        await session.refresh(sp)
        
        priority = RecommendationPriority.HIGH if level == "LOW" else RecommendationPriority.LOW
        rec = Recommendation(
            plan_id=sp.id,
            recommendation_type=RecommendationType.STUDY,
            priority=priority,
            message=f"Review weak concepts (Demo for {level} student)"
        )
        session.add(rec)
    await session.commit()

    print("\n--- DEMO DATA CREATED SUCCESSFULLY ---")
    print(f"Programs: 1")
    print(f"Semesters: 1")
    print(f"Subjects: {len(subjects)}")
    print(f"Units: {len(ai_chapters)}")
    print(f"Topics: {len(ai_topics)}")
    print(f"Students: {len(students)}")
    print(f"PYQs: 5")
    print(f"Questions: {len(questions)}")
    print(f"Exams: {len(test_data)}")
    print(f"Attempts: {len(test_data)}")
    print(f"Practical Experiments: 1")
    print(f"Materials: 1")

async def main():
    try:
        # FastAPI might be doing db init, but AsyncSessionLocal is async generator usually.
        # Wait, in session.py it says: AsyncSessionLocal = async_sessionmaker(...)
        async for session in get_db():
            pass # We just need a single session
    except:
        pass
    
    # session.py has:
    # async def get_db() -> AsyncGenerator[AsyncSession, None]:
    #     async with AsyncSessionLocal() as session:
    #         yield session
            
    # We can use AsyncSessionLocal as a context manager directly
    async with AsyncSessionLocal() as session:
        try:
            await clean_demo_data(session)
            await seed_demo_data(session)
        except Exception as e:
            await session.rollback()
            print(f"Error seeding data: {e}")

if __name__ == "__main__":
    asyncio.run(main())
