# Online Course Learning Management System

> **Project Owner / Author:** Lokesh Yadav  
> **Architecture:** Full-Stack Web Application (Vanilla HTML/CSS/JS + Node.js/Express + MySQL)

---

## 📌 Project Overview
The **Online Course Learning Management System** is a responsive, modern e-learning platform designed to manage online courses and student enrollments seamlessly.

- **Instructors:** Create and publish courses, upload learning materials (PDFs, notes, media), design curriculum lessons, and monitor student enrollments.
- **Students:** Browse course catalogs, enroll in courses, view lessons, and track personal completion progress in real-time.
- **Authentication & Security:** Robust role-based access control (Student vs Instructor), `bcryptjs` password hashing, and signed JSON Web Tokens (JWT).

---

## 🛠️ Technology Stack
- **Frontend:** Semantic HTML5, Modern CSS3 (Dark Navy & Purple theme, CSS Grid, Flexbox), Vanilla JavaScript (ES6+).
- **Backend:** Node.js, Express.js (Modular MVC, RESTful APIs, JWT & Role middleware).
- **Database:** MySQL (Relational schema `online_course_lms`, foreign keys, cascade deletes).
- **Security:** `bcryptjs` for password hashing, `jsonwebtoken` for stateless auth, input validation (email regex, password length).

---

## 🔐 Complete Authentication Flow & API Reference

| Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new Student or Instructor with hashed password | Public |
| `POST` | `/api/auth/login` | Authenticate with email & password, returns JWT | Public |
| `GET` | `/api/auth/me` | Fetch verified profile of currently logged-in user | Authenticated |
| `GET` | `/api/courses` | List all courses with optional keyword search | Public |
| `POST` | `/api/courses` | Create and publish a new course | Instructor Only |
| `POST` | `/api/enrollments` | Enroll in a course | Authenticated |
| `POST` | `/api/enrollments/progress` | Update completed lessons & percentage progress | Authenticated |

---

## 📂 Project Directory Structure

```text
Online Course Learning Management System/
│
├── backend/                        # Backend Application Source Code
│   ├── configuration/              # Database configurations
│   │   └── db.js                   # MySQL connection pool & data layer
│   │
│   ├── controllers/                # Business logic controllers
│   │   ├── authController.js       # Register, login, email validation, bcrypt & JWT
│   │   ├── courseController.js     # Course CRUD and catalog queries
│   │   ├── enrollmentController.js # Enrollment & progress tracking logic
│   │   ├── lessonController.js     # Lesson management & attachments
│   │   └── userController.js       # User profiles & platform stats
│   │
│   ├── middleware/                 # Express custom middlewares
│   │   ├── authMiddleware.js       # JWT Bearer verification
│   │   ├── errorHandler.js         # Centralized error handler
│   │   ├── roleMiddleware.js       # Role guard (Student / Instructor / Admin)
│   │   └── uploadMiddleware.js     # Multer file upload handler
│   │
│   └── routes/                     # RESTful API route definitions
│       ├── authRoutes.js           # /api/auth routes
│       ├── courseRoutes.js         # /api/courses routes
│       ├── enrollmentRoutes.js     # /api/enrollments routes
│       ├── lessonRoutes.js         # /api/lessons routes
│       └── userRoutes.js           # /api/users routes
│
├── database/                       # Database DDL & Seed Scripts
│   ├── schema.sql                  # MySQL tables & foreign keys (online_course_lms)
│   └── seed.sql                    # Initial seed data for testing
│
├── frontend/                       # Semantic HTML5 Client Views
│   ├── index.html                  # 1. Home Page
│   ├── login.html                  # 2. Sign In (with 1-click test fill)
│   ├── register.html               # 3. Registration (Student vs Instructor)
│   ├── student-dashboard.html      # 4. Student Dashboard
│   ├── instructor-dashboard.html   # 5. Instructor Studio
│   ├── courses.html                # 6. Course Catalog
│   ├── course-details.html         # 7. Course Overview & Syllabus
│   ├── my-courses.html             # 8. My Enrolled Courses & Progress
│   ├── lesson.html                 # 9. Interactive Classroom Player
│   └── create-course.html          # Instructor course creation form
│
├── public/                         # Publicly served static assets
│   ├── css/                        # Design system & modular stylesheets
│   │   ├── style.css               # Navy & Purple design tokens & footer
│   │   ├── navbar.css              # Header & responsive mobile toggle
│   │   ├── dashboard.css           # Dashboards, cards, progress bars
│   │   ├── lesson.css              # Video stage, tabs & curriculum list
│   │   └── responsive.css          # Mobile & tablet breakpoints
│   │
│   └── js/                         # Vanilla client-side scripts
│       ├── main.js                 # API caller & role access guard
│       ├── auth.js                 # Login/Register validation & alerts
│       ├── courses.js              # Catalog search, filter pills, enrollment
│       ├── dashboard.js            # Student/Instructor dashboards
│       └── lesson.js               # Video classroom & mark complete
│
├── test-auth.js                    # Automated test suite for authentication
├── package.json                    # Project dependencies and npm scripts
├── README.md                       # Comprehensive documentation
└── server.js                       # Express server entry point & static server
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.0+)

### 2. Installation
```bash
npm install
```

### 3. Database Setup
```bash
mysql -u root -p < database/schema.sql
```

### 4. Running the Application
```bash
npm start
# OR for live reload:
npm run dev
```

Visit the application in your browser:
```
http://localhost:5000
```

### 5. Running Automated Authentication Tests
```bash
npm run test:auth
```
