import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://agentexam:password@localhost:5432/agentexam")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT email, role FROM \"user\""))
        users = res.fetchall()
        print(f"Total users: {len(users)}")
        for u in users:
            print(u)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
