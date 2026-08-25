import asyncio
import uuid
from app.db.session import AsyncSessionLocal
from app.models.user import Student, RoleType
from app.models.academic import StudyMaterial, Subject
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Create users
        u1 = Student(
            id=uuid.uuid4(),
            email="u1@test.com",
            name="U1",
            password_hash="test",
            role=RoleType.STUDENT
        )
        u2 = Student(
            id=uuid.uuid4(),
            email="u2@test.com",
            name="U2",
            password_hash="test",
            role=RoleType.STUDENT
        )
        db.add_all([u1, u2])
        await db.commit()

        # Get a subject
        sub = (await db.execute(select(Subject).limit(1))).scalars().first()

        # Create material for U1
        mat = StudyMaterial(
            id=uuid.uuid4(),
            subject_id=sub.id,
            uploaded_by=u1.id,
            material_type="NOTES",
            title="U1 Notes",
            file_name="u1.pdf",
            file_type="pdf",
            mime_type="application/pdf",
            file_size=100,
            storage_key="test",
            processing_status="COMPLETED"
        )
        db.add(mat)
        await db.commit()

        # Now query materials as if we were in the route
        # For U1
        res1 = await db.execute(select(StudyMaterial).where(StudyMaterial.uploaded_by == u1.id))
        mats1 = res1.scalars().all()

        # For U2
        res2 = await db.execute(select(StudyMaterial).where(StudyMaterial.uploaded_by == u2.id))
        mats2 = res2.scalars().all()

        print(f"U1 materials: {[m.title for m in mats1]}")
        print(f"U2 materials: {[m.title for m in mats2]}")

if __name__ == "__main__":
    asyncio.run(main())
