import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy.future import select
import asyncio

async def get_token():
    async with AsyncSessionLocal() as db:
        stmt = select(User).limit(1)
        result = await db.execute(stmt)
        user = result.scalars().first()
        from datetime import timedelta
        access_token_expires = timedelta(minutes=60)
        token = create_access_token(
            subject=user.id, role=user.role, expires_delta=access_token_expires
        )
        return token

def test():
    token = asyncio.run(get_token())
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/pyqs/?skip=0&limit=50", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Body: {response.text}")

if __name__ == "__main__":
    test()
