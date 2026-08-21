from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User, Student, Teacher, Admin, RoleType
from app.schemas.user import UserCreate
from app.core.security import get_password_hash


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    hashed_password = get_password_hash(user_in.password)
    
    # We use polymorphic identity to create the correct child class
    if user_in.role == RoleType.STUDENT:
        db_user = Student(
            email=user_in.email,
            name=user_in.name,
            password_hash=hashed_password,
            role=user_in.role,
        )
    elif user_in.role == RoleType.TEACHER:
        db_user = Teacher(
            email=user_in.email,
            name=user_in.name,
            password_hash=hashed_password,
            role=user_in.role,
        )
    elif user_in.role == RoleType.ADMIN:
        db_user = Admin(
            email=user_in.email,
            name=user_in.name,
            password_hash=hashed_password,
            role=user_in.role,
        )
    else:
        # Fallback to base User
        db_user = User(
            email=user_in.email,
            name=user_in.name,
            password_hash=hashed_password,
            role=user_in.role,
        )
        
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
