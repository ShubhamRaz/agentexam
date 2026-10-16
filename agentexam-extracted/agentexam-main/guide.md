# AgentExam Project Guide

Welcome to the AgentExam project! This guide will walk you through the steps to start and stop the application. The project consists of a React frontend and a FastAPI (Python) backend.

## 🚀 Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (for the frontend)
- [Python 3.9+](https://www.python.org/) (for the backend)

---

## 🟢 Starting the Project

You will need to open **two separate terminal windows**: one for the backend and one for the frontend.

### Step 1: Start the Backend (FastAPI)

1. Open your first terminal and navigate to the project's root directory:
   ```bash
   cd "C:\Users\SHUBHAM RAJ\Desktop\FIVE\AgentExam"
   ```

2. Navigate into the `backend` directory:
   ```bash
   cd backend
   ```

3. Activate the Python virtual environment:
   ```powershell
   # If you are using PowerShell
   .\.venv\Scripts\Activate.ps1
   # (Or .\venv\Scripts\Activate.ps1 depending on your setup)
   ```

4. Install the required Python dependencies (only needed the first time or when `requirements.txt` changes):
   ```bash
   pip install -r requirements.txt
   ```

5. Run the backend development server using Uvicorn:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend should now be running at `http://localhost:8000`. You can access the API documentation at `http://localhost:8000/docs`.*

### Step 2: Start the Frontend (React + Vite)

1. Open a **second terminal** and navigate to the project's root directory:
   ```bash
   cd "C:\Users\SHUBHAM RAJ\Desktop\FIVE\AgentExam"
   ```

2. Navigate into the `frontend` directory:
   ```bash
   cd frontend
   ```

3. Install the Node dependencies (only needed the first time or when `package.json` changes):
   ```bash
   npm install
   ```

4. Run the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend should now be running at `http://localhost:5173`. Open this URL in your browser to view the application.*

---

## 🛑 Stopping the Project

When you are done working on the project, you can stop both servers.

1. **Stop the Backend**:
   - Go to the terminal running the FastAPI (Uvicorn) server.
   - Press `Ctrl + C` on your keyboard.
   - If prompted to "Terminate batch job (Y/N)?", type `Y` and press `Enter`.
   - To deactivate the Python virtual environment, type:
     ```bash
     deactivate
     ```

2. **Stop the Frontend**:
   - Go to the terminal running the Vite server.
   - Press `Ctrl + C` on your keyboard.
   - If prompted to "Terminate batch job (Y/N)?", type `Y` and press `Enter`.

## 🎉 You're all set!
Your development environment is now cleanly shut down.
