import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text, update

from app.db.session import AsyncSessionLocal
from app.models.user import User, Student, Teacher, Admin
from app.models.academic import Course, Semester, Subject, Chapter, Topic, StudyMaterial, MaterialAnalysis
from app.models.exam import MockTest, Question, Answer, Evaluation, Result, ResultAnalytics
from app.models.plan import StudyPlan, Recommendation
from app.models.practical import Experiment, PracticalSubmission, PracticalEvaluation

async def clean_database():
    print("Starting database dummy data cleanup...")
    async with AsyncSessionLocal() as session:
        # 1. Identify dummy/demo users to remove
        # Keep real user 'pankajkr6810@gmail.com'
        res = await session.execute(
            select(User).where(User.email != 'pankajkr6810@gmail.com')
        )
        dummy_users = res.scalars().all()
        dummy_user_ids = [u.id for u in dummy_users]
        print(f"Found {len(dummy_users)} dummy users to remove: {[u.email for u in dummy_users]}")

        if dummy_user_ids:
            # Delete dependent records for dummy users
            await session.execute(delete(ResultAnalytics).where(ResultAnalytics.result_id.in_(
                select(Result.id).where(Result.student_id.in_(dummy_user_ids))
            )))
            await session.execute(delete(Result).where(Result.student_id.in_(dummy_user_ids)))

            # Delete answers and evaluations
            await session.execute(delete(Evaluation).where(Evaluation.answer_id.in_(
                select(Answer.id).where(Answer.student_id.in_(dummy_user_ids))
            )))
            await session.execute(delete(Answer).where(Answer.student_id.in_(dummy_user_ids)))

            # Delete practical submissions
            await session.execute(delete(PracticalEvaluation).where(PracticalEvaluation.submission_id.in_(
                select(PracticalSubmission.id).where(PracticalSubmission.student_id.in_(dummy_user_ids))
            )))
            await session.execute(delete(PracticalSubmission).where(PracticalSubmission.student_id.in_(dummy_user_ids)))

            # Delete mock tests
            mock_test_ids = (await session.execute(select(MockTest.id).where(MockTest.student_id.in_(dummy_user_ids)))).scalars().all()
            for mt_id in mock_test_ids:
                await session.execute(text(f"DELETE FROM mock_test_question WHERE test_id = '{mt_id}'"))
                await session.execute(text(f"DELETE FROM mock_test_experiment WHERE test_id = '{mt_id}'"))
            await session.execute(delete(MockTest).where(MockTest.student_id.in_(dummy_user_ids)))

            # Delete study plans & recommendations for dummy users
            await session.execute(delete(Recommendation).where(Recommendation.plan_id.in_(
                select(StudyPlan.id).where(StudyPlan.student_id.in_(dummy_user_ids))
            )))
            await session.execute(delete(StudyPlan).where(StudyPlan.student_id.in_(dummy_user_ids)))

            # Delete materials uploaded by dummy users
            dummy_mats = (await session.execute(select(StudyMaterial.id).where(StudyMaterial.uploaded_by.in_(dummy_user_ids)))).scalars().all()
            if dummy_mats:
                await session.execute(delete(MaterialAnalysis).where(MaterialAnalysis.material_id.in_(dummy_mats)))
                await session.execute(delete(StudyMaterial).where(StudyMaterial.id.in_(dummy_mats)))

            # Reassign or delete questions created by dummy admin
            # Instead of deleting questions, reassign created_by to NULL or delete if purely demo
            await session.execute(text("UPDATE question SET created_by = NULL WHERE created_by IN :ids"), {"ids": tuple(dummy_user_ids)})

            # Delete users
            await session.execute(delete(Student).where(Student.id.in_(dummy_user_ids)))
            await session.execute(delete(Admin).where(Admin.id.in_(dummy_user_ids)))
            await session.execute(delete(Teacher).where(Teacher.id.in_(dummy_user_ids)))
            await session.execute(delete(User).where(User.id.in_(dummy_user_ids)))

        # 2. Clean Course names and codes: rename DEMO-BTECH-CSE to BTECH-CSE
        await session.execute(
            text("UPDATE course SET code = 'BTECH-CSE', name = 'B.Tech Computer Science & Engineering', description = 'Undergraduate degree program in Computer Science & Engineering' WHERE code LIKE 'DEMO-%'")
        )

        # 3. Clean Subject descriptions: remove 'Demo'
        await session.execute(
            text("UPDATE subject SET description = 'Core course covering foundational principles and practical applications.' WHERE description LIKE 'Demo %'")
        )

        # 4. Clean Question texts: remove '[DEMO]' prefix
        await session.execute(
            text("UPDATE question SET question_text = REPLACE(question_text, '[DEMO] ', '') WHERE question_text LIKE '[DEMO]%'")
        )

        # 5. Clean Experiment titles: remove '[DEMO]' prefix
        await session.execute(
            text("UPDATE experiment SET title = REPLACE(title, '[DEMO] ', '') WHERE title LIKE '[DEMO]%'")
        )

        # 6. Update student enrollment for pankajkr6810@gmail.com if missing
        real_user = (await session.execute(select(User).where(User.email == 'pankajkr6810@gmail.com'))).scalar_one_or_none()
        if real_user:
            real_student = (await session.execute(select(Student).where(Student.id == real_user.id))).scalar_one_or_none()
            if real_student and not real_student.enrollment_no:
                real_student.enrollment_no = "CSE2024001"
                real_student.semester = 6
                real_student.department = "Computer Science & Engineering"

        await session.commit()
        print("Database cleanup completed successfully!")

if __name__ == '__main__':
    asyncio.run(clean_database())
