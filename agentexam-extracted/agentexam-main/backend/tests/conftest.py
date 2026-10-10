import os
import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.sql import text

# Force the application to use the test database
os.environ["DATABASE_URL"] = "postgresql+asyncpg://agentexam:password@localhost:5432/agentexam_test"
os.environ["JWT_SECRET_KEY"] = "test_secret_key"
os.environ["APP_ENV"] = "test"

from app.main import app
from app.db.session import get_db
from app.models.user import User
from app.core.security import create_access_token

from sqlalchemy.pool import NullPool

# Test engine
test_engine = create_async_engine(
    os.environ["DATABASE_URL"],
    echo=False,
    future=True,
    poolclass=NullPool
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session

# Override the FastAPI dependency and AsyncSessionLocal factory
import app.db.session as db_session_module
db_session_module.AsyncSessionLocal = TestSessionLocal
app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", follow_redirects=True) as ac:
        yield ac

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session

from sqlalchemy import select

@pytest_asyncio.fixture(scope="function")
async def demo_student(db_session: AsyncSession) -> User:
    result = await db_session.execute(select(User).where(User.email == 'demo.student1@example.com'))
    user = result.scalars().first()
    return user

@pytest_asyncio.fixture(scope="function")
async def demo_student2(db_session: AsyncSession) -> User:
    result = await db_session.execute(select(User).where(User.email == 'demo.student2@example.com'))
    user = result.scalars().first()
    return user

@pytest_asyncio.fixture(scope="function")
async def demo_admin(db_session: AsyncSession) -> User:
    result = await db_session.execute(select(User).where(User.email == 'demo.admin@example.com'))
    user = result.scalars().first()
    return user

@pytest_asyncio.fixture(scope="function")
async def auth_client_student(demo_student) -> AsyncClient:
    token = create_access_token(subject=str(demo_student.id), role=demo_student.role)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", follow_redirects=True) as ac:
        ac.headers.update({"Authorization": f"Bearer {token}"})
        yield ac

@pytest_asyncio.fixture(scope="function")
async def auth_client_student2(demo_student2) -> AsyncClient:
    token = create_access_token(subject=str(demo_student2.id), role=demo_student2.role)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", follow_redirects=True) as ac:
        ac.headers.update({"Authorization": f"Bearer {token}"})
        yield ac

@pytest_asyncio.fixture(scope="function")
async def auth_client_admin(demo_admin) -> AsyncClient:
    token = create_access_token(subject=str(demo_admin.id), role=demo_admin.role)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", follow_redirects=True) as ac:
        ac.headers.update({"Authorization": f"Bearer {token}"})
        yield ac

@pytest_asyncio.fixture(scope="function")
async def demo_subject_id(db_session: AsyncSession) -> str:
    result = await db_session.execute(text("SELECT id FROM subject LIMIT 1"))
    row = result.fetchone()
    if row:
        return str(row.id)
    return ""

