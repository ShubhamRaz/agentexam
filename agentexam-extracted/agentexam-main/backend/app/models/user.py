import uuid
from sqlalchemy import String, Boolean, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base
import enum


class RoleType(str, enum.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"


class User(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleType] = mapped_column(Enum(RoleType), default=RoleType.STUDENT, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    __mapper_args__ = {
        "polymorphic_identity": "user",
        "polymorphic_on": "role",
    }


class Student(User):
    __tablename__ = "student"
    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), primary_key=True)
    enrollment_no: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=True)
    semester: Mapped[str] = mapped_column(String(20), nullable=True)
    department: Mapped[str] = mapped_column(String(100), nullable=True)
    
    __mapper_args__ = {
        "polymorphic_identity": RoleType.STUDENT,
    }


class Teacher(User):
    __tablename__ = "teacher"
    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=True)
    designation: Mapped[str] = mapped_column(String(100), nullable=True)
    
    __mapper_args__ = {
        "polymorphic_identity": RoleType.TEACHER,
    }


class Admin(User):
    __tablename__ = "admin"
    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), primary_key=True)
    level: Mapped[str] = mapped_column(String(50), nullable=True)
    
    __mapper_args__ = {
        "polymorphic_identity": RoleType.ADMIN,
    }
