# AgentExam Backend

This is the FastAPI backend for the AgentExam project.

## Local Development Setup

1. **Create and activate a virtual environment:**
   ```bash
   python -m venv .venv
   
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment:**
   Copy the example environment file and fill in required values:
   ```bash
   cp .env.example .env
   ```

4. **Start the FastAPI server:**
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Access the API:**
   - Health check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
   - Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Testing
Run tests using pytest:
```bash
pytest
```
