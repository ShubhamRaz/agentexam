import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine('postgresql+asyncpg://agentexam:password@localhost:5432/agentexam_test')
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT options FROM question WHERE question_type = \'MCQ\' LIMIT 1'))
        row = result.fetchone()
        if row:
            print("Options type:", type(row[0]))
            print("Options value:", row[0])
        else:
            print("No MCQ questions found")
    await engine.dispose()

asyncio.run(main())
