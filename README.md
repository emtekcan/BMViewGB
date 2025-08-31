# BMViewGB

## Installation Guide

This guide will walk you through the steps to set up and run the BMViewGB project on your local machine.

### Prerequisites

Before you begin, ensure you have the following installed on your system:
*   [Python](https://www.python.org/downloads/) (version 3.10 or later recommended)
*   [Node.js and npm](https://nodejs.org/en/download/)

### Setup Instructions

#### 1. Download Data

The application requires specific data files to function correctly.

*   Download the CSV data files from the following Google Drive folder:
    [BMViewGB Data](https://drive.google.com/drive/folders/1a2KNcrTmrgl08Gke7hFIlAjSpoDB3FJW?usp=drive_link)
*   Place all the downloaded `.csv` files into the `backend/data/` directory.

#### 2. Backend Setup

The backend is a Django application that serves data to the frontend.

*   **Activate a Virtual Environment**

    ```bash
    # Create and activate a new virtual environment and install requirements
    python3 -m venv new_venv
    source new_venv/bin/activate
    pip install -r backend/requirements.txt
    ```

*   **Navigate to the Backend Directory**

    ```bash
    cd backend
    ```

*   **Run the Initial Setup Script**

    This script prepares the database and performs other necessary initializations.

    ```bash
    python initial_setup.py
    ```

*   **Run the Backend Server**

    Start the Django development server:

    ```bash
    python manage.py runserver
    ```

    The backend API should now be running at `http://127.0.0.1:8000/`. Keep this terminal window open.

#### 3. Frontend Setup

The frontend is a React application that provides the user interface.

*   **Open a New Terminal**

    Leave the backend server running in the original terminal. Open a new terminal window or tab and navigate back to the project's root directory if needed.

*   **Navigate to the Frontend Directory**

    ```bash
    cd frontend
    ```

*   **Install Dependencies**

    Install the necessary Node.js packages:

    ```bash
    npm install
    ```

*   **Run the Frontend Application**

    Start the React development server:

    ```bash
    npm start
    ```

    This command will automatically open the application in your default web browser, pointing to `http://localhost:3000`.

You should now have the BMViewGB application running locally.

## Docker Installation Guide
Coming Soon