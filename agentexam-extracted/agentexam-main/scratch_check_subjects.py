import sys
sys.path.insert(0, 'backend')
import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT * FROM subject'))
        rows = res.fetchall()
        print("Subjects:", rows)

if __name__ == "__main__":
    asyncio.run(main())
