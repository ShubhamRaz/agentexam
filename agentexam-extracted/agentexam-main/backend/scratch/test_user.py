import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy.future import select

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(User).limit(1)
        result = await db.execute(stmt)
        user = result.scalars().first()
        if user:
            print(f"Found user: {user.email}")
        else:
            print("No user found")

if __name__ == "__main__":
    asyncio.run(main())
