"""Apply uploaded_by column migration to the test database."""
import asyncio
import asyncpg


async def main():
    conn = await asyncpg.connect(
        "postgresql://agentexam:password@localhost:5432/agentexam_test"
    )
    try:
        await conn.execute(
            "ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS "
            'uploaded_by UUID REFERENCES "user"(id) ON DELETE SET NULL'
        )
        print("OK: uploaded_by added to document_chunks in agentexam_test")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()


asyncio.run(main())
