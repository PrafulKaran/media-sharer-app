
# Media Sharer App

A full-stack web application allowing users to upload images, audio, and other files, organize them into folders (optionally password-protected), and share them via generated links. Built with React, Flask, and Supabase.


## Table of Contents

*   [Features](#features)
*   [Tech Stack](#tech-stack)
*   [Project Structure](#project-structure)
*   [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Cloning](#cloning)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup](#frontend-setup)
    *   [Running Locally](#running-locally)
*   [Environment Variables](#environment-variables)
*   [Deployment](#deployment)
    *   [Backend (Render)](#backend-render)
    *   [Frontend (Vercel)](#frontend-vercel)
*   [API Endpoints](#api-endpoints)
*   [Contributing](#contributing)
*   [License](#license)

## Features

*   **Folder Creation:** Create folders to organize files.
*   **Password Protection:** Optionally protect folders with a password. Accessing protected folder contents requires verification.
*   **File Upload:** Upload various file types (images, audio, video, documents) to specific folders.
*   **File Listing:** View files within a selected folder.
*   **File Viewing/Playback:** Preview images and playback browser-supported audio/video files directly within an in-page lightbox modal using temporary signed URLs.
*   **File Deletion:** Delete individual files (with confirmation).
*   **Folder Deletion:** Delete entire folders and their contents (with password confirmation for protected folders).
*   **Share Link Copying:** Generate and copy temporary, secure download/view links for individual files.
*   **Session-Based Access:** Password verification for protected folders uses server-side sessions with an inactivity timeout.
*   **Responsive UI:** Basic responsiveness implemented for core layouts.

## Tech Stack

*   **Frontend:**
    *   React (using Vite)
    *   Material UI (MUI) v5 - Component Library
    *   React Router DOM - Client-side Routing
    *   Axios - HTTP Client
    *   Yet Another React Lightbox - File Previews
    *   Prop Types - Type checking
*   **Backend:**
    *   Python 3.11+
    *   Flask - Microframework
    *   Flask-CORS - Cross-Origin Resource Sharing Handling
    *   Supabase-py - Python client for Supabase
    *   python-dotenv - Environment variable loading
    *   Bcrypt - Password Hashing
    *   Gunicorn - Production WSGI Server
    *   Gevent (Optional) - Asynchronous worker for Gunicorn
*   **Database:** Supabase PostgreSQL
*   **Storage:** Supabase Storage (Private Bucket)
*   **Deployment:**
    *   Backend: Render (or similar Python hosting)
    *   Frontend: Vercel (or similar static/frontend hosting)

## Project Structure

```
media-sharer-app/
├── .gitignore          # Git ignore rules
├── backend/            # Flask backend application
│   ├── app/            # Main Flask application package
│   │   ├── __init__.py   # App factory (configures Flask, CORS, sessions, blueprints)
│   │   ├── blueprints/   # Flask Blueprints for route organization
│   │   │   ├── __init__.py
│   │   │   ├── files.py  # Routes for /api/files/**
│   │   │   └── folders.py# Routes for /api/folders/**
│   │   └── services/     # Service layer for business logic & DB interaction
│   │       ├── __init__.py
│   │       ├── file_service.py    # Logic for files and storage
│   │       ├── folder_service.py  # Logic for folders
│   │       └── supabase_client.py # Supabase client initialization
│   ├── venv/           # Python virtual environment (ignored by git)
│   ├── .env            # Local environment variables (ignored by git)
│   ├── Procfile        # Defines process types for Render (e.g., web server command)
│   ├── requirements.txt# Python dependencies
│   └── run.py          # Script to run the Flask app (using factory)
│
├── frontend/           # React frontend application
│   ├── public/         # Static assets
│   ├── src/            # React source code
│   │   ├── assets/       # Static assets like images used in components
│   │   ├── components/   # Reusable UI components (e.g., FolderList, FileUpload)
│   │   ├── pages/        # Page-level components (e.g., HomePage, FolderDetailPage)
│   │   ├── services/     # API interaction layer (api.js)
│   │   ├── App.jsx       # Main application component with routing setup
│   │   ├── index.css     # Global CSS
│   │   └── main.jsx      # Application entry point (renders App)
│   ├── .gitignore      # Frontend-specific git ignores
│   ├── index.html      # Main HTML entry point for Vite
│   ├── package.json    # Node dependencies and scripts
│   ├── vite.config.js  # Vite configuration
│   └── # Other config files (postcss, etc.)
│
└── README.md           # This file
```

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   Node.js (v18 or later recommended) and npm/yarn
*   Python (v3.11 or later recommended) and pip
*   Git
*   A Supabase Account ([https://supabase.com/](https://supabase.com/))

### Cloning

```bash
git clone https://github.com/prafulkaran/media-sharer-app.git # Replace with your repo URL if different
cd media-sharer-app
```

### Backend Setup

1.  **Navigate to Backend:**
    ```bash
    cd backend
    ```
2.  **Create & Activate Virtual Environment:**
    ```bash
    # Create venv
    python -m venv venv
    # Activate (Windows Git Bash/Linux/macOS)
    source venv/Scripts/activate # Or venv/bin/activate on Linux/macOS
    # Activate (Windows CMD)
    # venv\Scripts\activate.bat
    # Activate (Windows PowerShell)
    # .\venv\Scripts\Activate.ps1
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Set Up Supabase:**
    *   Create a new project on Supabase.
    *   In the SQL Editor, run the SQL commands to create the `folders` and `files` tables (or use the Supabase UI Table Editor):
        *   Define `folders` table (columns: `id` (int8, pk), `created_at` (timestamptz), `name` (text, not null), `password_hash` (text, nullable)).
        *   Define `files` table (columns: `id` (int8, pk), `created_at` (timestamptz), `name` (text, not null), `folder_id` (int8, not null, fk -> folders.id ON DELETE CASCADE), `storage_path` (text, not null, unique), `mime_type` (text, nullable), `size` (int8, nullable), `uploaded_at` (timestamptz, default now(), not null)).
    *   Go to Storage settings and create a **private** bucket named `media-files`.
5.  **Create `.env` File:**
    *   Create a file named `.env` inside the `backend` directory.
    *   Add your Supabase credentials and a strong secret key:
      ```dotenv
      SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
      SUPABASE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
      SECRET_KEY=YOUR_GENERATED_STRONG_SECRET_KEY_FOR_FLASK_SESSIONS
      FRONTEND_URL=http://localhost:5173 # For local development CORS
      # Optional:
      # SESSION_LIFETIME_MINUTES=10
      # FLASK_ENV=development
      ```
    *   *(Remember `.env` is ignored by git)*

### Frontend Setup

1.  **Navigate to Frontend:**
    ```bash
    # From the project root (e.g., media-sharer-app/)
    cd frontend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3.  **Configure API URL (Optional for Local):** The `api.js` service defaults to `http://localhost:5000/api`. For local development, this usually works without changes. For deployed versions, set the `VITE_API_BASE_URL` environment variable.

### Running Locally

1.  **Start Backend Server:**
    *   Open a terminal in the `backend` directory.
    *   Activate the virtual environment (`source venv/Scripts/activate`).
    *   Run the application using `run.py` (uses Flask dev server) or Gunicorn/Waitress for production simulation:
        ```bash
        # Using development server (easier debugging)
        python run.py
        # OR using Waitress (Windows compatible prod-like server)
        # waitress-serve --host 0.0.0.0 --port 5000 "run:create_app()"
        # OR using Gunicorn (Linux/macOS/WSL/Git Bash prod server)
        # gunicorn "run:create_app()" --workers 2 --bind 0.0.0.0:5000
        ```
    *   The backend should be running on `http://localhost:5000`.
2.  **Start Frontend Server:**
    *   Open a *separate* terminal in the `frontend` directory.
    *   Run the development server:
        ```bash
        npm run dev
        # or yarn dev
        ```
    *   The frontend should be accessible at `http://localhost:5173` (or another port if 5173 is busy).

## Environment Variables

The application relies on environment variables for configuration.

### Backend (`backend/.env` or Render Environment Variables)

*   `SUPABASE_URL` (Required): Your project's Supabase URL.
*   `SUPABASE_KEY` (Required): Your Supabase **Service Role** key (keep secret!).
*   `SECRET_KEY` (Required): A long, random, secret string for signing Flask sessions. Generate using `python -c "import secrets; print(secrets.token_hex(24))"`.
*   `FRONTEND_URL` (Required): The exact URL of the frontend accessing the API.
    *   Local: `http://localhost:5173` (or your Vite port)
    *   Production: `https://your-app-name.vercel.app` (Your Vercel deployment URL)
*   `FLASK_ENV` (Optional): Set to `production` on Render for production settings (disables debug mode, enables secure cookies if `APP_IS_HTTPS` is true). Defaults to `development`.
*   `SESSION_LIFETIME_MINUTES` (Optional): Inactivity timeout for sessions in minutes. Defaults to `10`.
*   `APP_IS_HTTPS` (Optional): Set to `true` if deployed behind HTTPS (like on Render/Vercel) to enable `Secure` flag on session cookies. Defaults based on `FLASK_ENV`.

### Frontend (Vercel Environment Variables)

*   `VITE_API_BASE_URL` (Required for Production): The full URL to your deployed backend API endpoint (e.g., `https://your-render-app.onrender.com/api`). The `VITE_` prefix is required by Vite to expose it to the frontend code. *(Use `REACT_APP_API_BASE_URL` if using Create React App)*.

## Deployment

### Backend (Render)

1.  Connect your Git repository to Render.
2.  Create a new "Web Service".
3.  Render should detect Python and `requirements.txt`.
4.  **Build Command:** Render might automatically use `pip install -r requirements.txt` if `requirements.txt` is present at the root of the build context. Ensure it runs correctly.
5.  **Start Command:** Render should detect the `Procfile`. Verify it uses the `web:` line (e.g., `gunicorn "run:create_app()" --workers 4 --worker-class gevent --bind 0.0.0.0:$PORT`). Adjust `--workers` based on your plan.
6.  **Environment Variables:** Set all required backend environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `SECRET_KEY`, `FLASK_ENV=production`, `FRONTEND_URL=https://your-vercel-app-url.vercel.app`).
7.  Deploy.

### Frontend (Vercel)

1.  Connect your Git repository to Vercel.
2.  Create a new Project.
3.  **Framework Preset:** Select "Vite" (or "Create React App").
4.  **Root Directory:** Set to `frontend`.
5.  **Build Command:** Should default correctly (e.g., `npm run build`).
6.  **Output Directory:** Should default correctly (`dist` for Vite, `build` for CRA).
7.  **Environment Variables:** Add `VITE_API_BASE_URL` and set its value to your deployed Render API URL (including `/api`).
8.  Deploy.

## API Endpoints

*(List your main API endpoints here for documentation purposes)*

*   `POST /api/folders`: Create a new folder.
*   `GET /api/folders`: List all folders.
*   `GET /api/folders/<id>`: Get details for a specific folder.
*   `DELETE /api/folders/<id>`: Delete a folder and its contents.
*   `POST /api/folders/<id>/verify-password`: Verify password for a protected folder & set session.
*   `GET /api/folders/<id>/check-access`: Check if current session allows access to a folder.
*   `POST /api/folders/<id>/files`: Upload a file to a folder.
*   `GET /api/folders/<id>/files`: List files in a folder.
*   `DELETE /api/files/<id>`: Delete a specific file (storage & DB).
*   `GET /api/files/<id>/signed-url`: Get a temporary access URL for a file.
*   `GET /api/ping`: Basic health check (debug only).
*   `GET /api/test-db`: DB connection check (debug only).

