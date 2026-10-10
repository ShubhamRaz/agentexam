import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User, RoleType
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"User: {u.email}, Role: {u.role}, type: {type(u.role)}")
            print(f"Equals RoleType.STUDENT? {u.role == RoleType.STUDENT}")

if __name__ == "__main__":
    asyncio.run(main())
