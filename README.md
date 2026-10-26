# 📋 TaskFlow – Task Manager with Kanban Board

> **A Complete Full Stack Development (FSD) College Submission Project**  
> Built with HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, Mongoose, and MongoDB Atlas.

---

## 🌟 Overview

**TaskFlow** is a modern, responsive web application for managing tasks using an intuitive **3-column Kanban Board** (To Do, In Progress, Done). It features drag-and-drop workflow updates, real-time search, priority filtering, metric dashboards, and automatic overdue task tracking.

Every change—from creating, editing, and deleting tasks to dragging them between columns—is persisted in **MongoDB Atlas** through an **Express REST API**.

---

## 🛠️ Technology Stack

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla ES6+) | Responsive dashboard, CSS Grid & Flexbox, HTML5 Drag & Drop API, SVG icons, Toast notifications, Modal dialogs |
| **Backend** | Node.js, Express.js | RESTful API, input validation, custom error handling middleware, static file serving |
| **Database** | MongoDB Atlas, Mongoose ODM | Cloud-hosted NoSQL database, structured schema, timestamps, enum validations |
| **Architecture** | Client-Server Architecture | Frontend served by Express to prevent CORS issues; RESTful JSON contracts |

---

## 📁 Project Folder Structure

```text
taskflow-kanban/
├── frontend/
│   ├── index.html          # Semantic HTML5 layout, modals, Kanban board
│   ├── styles.css          # Modern CSS with custom properties & responsive media queries
│   └── app.js              # Vanilla JS application logic, Drag-and-Drop, REST API fetch
├── backend/
│   ├── server.js           # Express app, static file server, health check, DB connection
│   ├── models/
│   │   └── Task.js         # Mongoose schema with validations, enums, and timestamps
│   ├── routes/
│   │   └── tasks.js        # REST API endpoints (GET, POST, PUT, PATCH, DELETE, seed)
│   ├── middleware/
│   │   └── errorHandler.js # Centralized error handling (CastError, ValidationError, etc.)
│   ├── seed.js             # Realistic sample data seeder (prevents duplicate tasks)
│   ├── test-api.js         # Automated test suite for CRUD and validation testing
│   ├── package.json        # Backend dependencies and run scripts
│   └── .env.example        # Environment variable template
├── package.json            # Root convenience scripts (start, seed, test)
├── .gitignore              # Ignores node_modules, .env secrets, and temporary files
└── README.md               # Beginner-friendly setup & evaluation guide
```

---

## 📋 Prerequisites & Required Software

Make sure you have the following installed on your computer:

1. **Node.js** (v18.x or higher) – [Download Node.js](https://nodejs.org/)
2. **npm** (bundled with Node.js, v9.x or higher)
3. A web browser (**Google Chrome**, **Mozilla Firefox**, **Microsoft Edge**, or **Safari**)
4. A free **MongoDB Atlas** account (or local MongoDB server) – [Sign Up for MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies

Open a terminal or command prompt inside the project folder:

```bash
# Navigate to backend folder
cd taskflow-kanban/backend

# Install required packages (express, mongoose, dotenv, cors, morgan)
npm install
```

*(Alternatively, you can run `npm run install:backend` from the `taskflow-kanban/` root folder).*

---

### Step 2: Create a Free MongoDB Atlas Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in or create a free account.
2. Click **"Create a Database"** and select the free **M0 (Free)** cluster tier.
3. Choose a cloud provider and region closest to you, then click **"Create Cluster"**.
4. In **Security Quickstart**:
   - **Database User**: Create a username (e.g. `student`) and password (e.g. `TaskFlow2026`). *Save these!*
   - Click **"Create User"**.
5. In **Network Access**:
   - Click **"Add IP Address"**.
   - Select **"Allow Access from Anywhere"** (`0.0.0.0/0`) or enter your current IP.
   - Click **"Confirm"**.
6. In **Database Deployments**:
   - Click the **"Connect"** button on your cluster.
   - Select **"Drivers"** (Node.js).
   - Copy the connection string. It looks like this:
     ```text
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```

---

### Step 3: Configure Environment Variables

1. In the `taskflow-kanban/backend/` folder, make a copy of `.env.example` and name it `.env`:

   ```bash
   # On Windows PowerShell:
   Copy-Item .env.example .env

   # On Linux/macOS:
   cp .env.example .env
   ```

2. Open the `.env` file in any text editor and replace the placeholder with your MongoDB Atlas connection string. Be sure to replace `<username>` and `<password>` with your real database user credentials:

   ```env
   # MongoDB Atlas Connection String
   MONGODB_URI=mongodb+srv://student:TaskFlow2026@cluster0.abcde.mongodb.net/taskflow?retryWrites=true&w=majority

   # Server Port
   PORT=3000
   ```

> ⚠️ **Important Security Note**: Never commit real `.env` files or credentials into Git repositories. The `.gitignore` file already excludes `.env`.

---

### Step 4: Populate Sample Data (Optional but Recommended)

To insert 6+ realistic tasks covering different priorities and statuses:

```bash
# From taskflow-kanban/backend/
npm run seed
```

*Note: The seed script intelligently prevents inserting duplicates if tasks already exist. If you ever want to reset the board, run:*
```bash
node seed.js --reset
```

---

### Step 5: Start the Server

```bash
# From taskflow-kanban/backend/
npm start
```

You should see terminal output like this:

```text
===================================================================
🚀 TaskFlow Server running at: http://localhost:3000
📋 Frontend UI: http://localhost:3000
🩺 Health API:  http://localhost:3000/api/health
📌 Tasks API:   http://localhost:3000/api/tasks
===================================================================
[MongoDB] Successfully connected to database: cluster0.abcde.mongodb.net/taskflow
```

---

### Step 6: Open the Application in Your Browser

Open your browser and navigate to:

👉 **[http://localhost:3000](http://localhost:3000)**

The frontend is served directly by Express. You will see:
- The sidebar with real-time **MongoDB: Connected** badge
- The dashboard metrics (Total, To Do, In Progress, Done, Overdue)
- The 3-column Kanban Board with tasks

---

## 🧪 Testing All CRUD Operations & Features

You can test all requirements right from the user interface:

### 1. Create a Task (POST)
- Click the **"+ Add Task"** button in the header or sidebar.
- Fill in:
  - **Title**: `Prepare Project Presentation` (required)
  - **Description**: `Create 5 slides summarizing architecture and database model.`
  - **Status**: `To Do`
  - **Priority**: `High`
  - **Due Date**: Select tomorrow's date
- Click **"Create Task"**.
- Notice the toast confirmation: *"Task created successfully!"*. The task appears in the **To Do** column and the total and To Do metrics increment.

### 2. View Tasks (GET)
- Notice all tasks are fetched from MongoDB and populated into their corresponding columns.
- Test the **Search Bar**: Type a keyword (e.g., `Presentation` or `Setup`). Only matching tasks will be shown.
- Test the **Priority Filter**: Select `High Priority`. Only high priority cards remain.
- Test the **Quick Filters** in the sidebar: Click `Overdue Tasks` to isolate overdue tasks.
- Click **"Reset Filters"** to restore all tasks.

### 3. Move Tasks via Drag-and-Drop (PATCH)
- Click and drag any task card from **"To Do"** and drop it into **"In Progress"** or **"Done"**.
- The card smoothly drops in, and a PATCH request (`/api/tasks/:id/status`) updates MongoDB in real time.
- The column count badges and completion rate progress bar update instantly.
- *Touch / Accessibility Alternative*: Use the **quick-move dropdown** at the bottom right of each card to move it without mouse dragging.

### 4. Edit an Existing Task (PUT)
- Click the **pencil (Edit)** icon on any task card.
- Modify the title, description, priority, or due date.
- Click **"Save Changes"**.
- The card updates immediately with changes saved to MongoDB.

### 5. Delete a Task (DELETE)
- Click the **trash (Delete)** icon on any task card.
- A styled confirmation modal appears asking: *"Are you sure you want to permanently delete [Task Title]?"*.
- Click **"Delete Task"**.
- The task is removed from the board and deleted from MongoDB Atlas.

---

## 🔌 Backend REST API Reference

| Method | Endpoint | Description | Request Body Example | Success Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Check server and MongoDB status | None | `200 OK` + Health JSON |
| `GET` | `/api/tasks` | Get all tasks (supports query params `?status=...&priority=...&search=...`) | None | `200 OK` + `data: [...]` |
| `GET` | `/api/tasks/:id` | Get single task by ID | None | `200 OK` + `data: {...}` |
| `POST` | `/api/tasks` | Create a new task | `{"title":"Task name","description":"...","status":"todo","priority":"high","dueDate":"2026-10-30"}` | `201 Created` |
| `PUT` | `/api/tasks/:id` | Update task details | `{"title":"Updated title","priority":"medium"}` | `200 OK` |
| `PATCH` | `/api/tasks/:id/status` | Move task status | `{"status":"in-progress"}` | `200 OK` |
| `DELETE` | `/api/tasks/:id` | Delete a task | None | `200 OK` |
| `POST` | `/api/tasks/seed` | Seed realistic tasks | None (`?clear=true` optional) | `201 Created` |

---

## 🤖 Running the Automated API Test Suite

The project includes an automated test script that tests every endpoint, validation rule, error handler, and status transition.

Run the test suite:

```bash
# From taskflow-kanban/backend/
npm test
```

Expected output:
```text
===================================================================
🧪 TaskFlow - Automated API & Integration Test Suite
===================================================================
1. Testing Health Endpoint (/api/health)
  ✅ PASS: GET /api/health returns HTTP 200
  ✅ PASS: Health status is 'ok'
  ✅ PASS: Health response includes 'database' info

2. Testing Live CRUD Cycle on MongoDB
  ✅ PASS: POST /api/tasks returns HTTP 201 Created
  ✅ PASS: Response contains success: true
  ✅ PASS: Created task matches title
  ✅ PASS: Task received valid MongoDB ObjectId
  ✅ PASS: POST /api/tasks with missing title returns HTTP 400 Bad Request
  ✅ PASS: POST /api/tasks with invalid status returns HTTP 400 Bad Request
  ✅ PASS: GET /api/tasks returns HTTP 200 OK
  ✅ PASS: GET /api/tasks returns array of tasks
  ✅ PASS: Task count reflects at least the created task
  ✅ PASS: GET /api/tasks/:id returns HTTP 200
  ✅ PASS: Fetched single task title matches
  ✅ PASS: GET with malformed ObjectId returns HTTP 400 Bad Request
  ✅ PASS: GET with non-existent ObjectId returns HTTP 404 Not Found
  ✅ PASS: PUT /api/tasks/:id returns HTTP 200 OK
  ✅ PASS: Updated task title reflects change
  ✅ PASS: Updated task priority reflects change
  ✅ PASS: PATCH /api/tasks/:id/status returns HTTP 200
  ✅ PASS: Task status successfully updated to 'in-progress'
  ✅ PASS: PATCH /api/tasks/:id/status updates to 'done'
  ✅ PASS: Task status successfully updated to 'done'
  ✅ PASS: DELETE /api/tasks/:id returns HTTP 200 OK
  ✅ PASS: GET after DELETE returns HTTP 404 Not Found

===================================================================
🏁 Test Summary: 21 Passed, 0 Failed
===================================================================
```

---

## 🛠️ Common Errors & Troubleshooting

### 1. `MongooseServerSelectionError: connect ECONNREFUSED` or connection timeout
- **Cause**: MongoDB Atlas has not whitelisted your current IP address.
- **Fix**:
  1. Open MongoDB Atlas.
  2. Navigate to **Network Access** in the left sidebar.
  3. Click **"Add IP Address"** and choose **"Allow Access from Anywhere"** (`0.0.0.0/0`).
  4. Wait 1-2 minutes for changes to deploy, then restart the server.

### 2. `MongoServerError: bad auth : authentication failed`
- **Cause**: Incorrect database username or password in `.env`.
- **Fix**: Check `MONGODB_URI` in `backend/.env`. Note that if your password contains special characters (like `@`, `#`, `%`), they must be URL-encoded, or create a password with only alphanumeric characters.

### 3. `EADDRINUSE: address already in use :::3000`
- **Cause**: Another program is already using port 3000.
- **Fix**: Either close that process or change the port in `backend/.env`:
  ```env
  PORT=3001
  ```

### 4. `Cannot find module 'express'`
- **Cause**: Dependencies were not installed.
- **Fix**: Run `npm install` inside the `taskflow-kanban/backend/` directory.

### 5. Database shows "Disconnected" in UI
- **Cause**: Server was started without `MONGODB_URI` configured.
- **Fix**: Follow Step 3 above to set your MongoDB Atlas URI in `backend/.env`, then restart the server.

---

## 📦 Submission Deliverables

- Complete working project folder: `taskflow-kanban/`
- Clean source archive: `taskflow-kanban.zip` (excludes `node_modules` and `.env` credentials)
- Database Model: `backend/models/Task.js`
- REST API Controller: `backend/routes/tasks.js`
- Frontend UI: `frontend/index.html`, `frontend/styles.css`, `frontend/app.js`
- Seeder Script: `backend/seed.js`
- Automated Test Suite: `backend/test-api.js`

---

## 📄 License & Academic Integrity

This project is created for educational and academic submission purposes. You are welcome to adapt and extend this project for your portfolio, coursework, or full-stack software development presentations.
