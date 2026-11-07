/* =========================================================
   Online Course Learning Management System - Main JS
   Project Owner: Lokesh Yadav
   ========================================================= */

const API_BASE = '/api';

// Rich Mock Dataset for fallback / sample courses
const MOCK_DATA = {
    courses: [
        {
            course_id: 1,
            title: 'Full-Stack Web Development Bootcamp',
            description: 'Master modern full-stack web engineering from frontend foundations (HTML5, CSS3, ES6+) to robust backend architectures with Node.js, Express, and MySQL databases.',
            category: 'Web Development',
            level: 'Beginner to Advanced',
            price: 79.99,
            rating: 4.9,
            reviews_count: 1420,
            instructor_name: 'Lokesh Yadav',
            total_students: 3820,
            banner_color: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            icon: '💻',
            lessons: [
                {
                    lesson_id: 1,
                    sequence_no: 1,
                    lesson_title: 'Introduction to Full-Stack Architecture',
                    duration: '22 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'In this foundational lesson, you will learn how client-server communication works over HTTP/HTTPS protocols, how RESTful endpoints structure requests, and how data flows from UI to database.'
                },
                {
                    lesson_id: 2,
                    sequence_no: 2,
                    lesson_title: 'Building Modular Express.js APIs',
                    duration: '35 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Learn how to structure enterprise-grade Express.js backends using the MVC (Model-View-Controller) design pattern with dedicated routes, controllers, and centralized error handling.'
                },
                {
                    lesson_id: 3,
                    sequence_no: 3,
                    lesson_title: 'MySQL Connection Pooling & Relational Queries',
                    duration: '40 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Discover how to leverage mysql2/promise connection pools to execute lightning-fast parameterized SQL queries while protecting against SQL injection vulnerabilities.'
                },
                {
                    lesson_id: 4,
                    sequence_no: 4,
                    lesson_title: 'JWT Authentication & Security Best Practices',
                    duration: '30 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Deep-dive into cryptographic password hashing with bcrypt, JSON Web Token generation, header verification middleware, and role-based route authorization.'
                }
            ]
        },
        {
            course_id: 2,
            title: 'Relational Database Design with MySQL',
            description: 'Learn professional database normalization, primary and foreign key constraints, high-performance SQL indexing, and transaction management from scratch.',
            category: 'Databases',
            level: 'Intermediate',
            price: 49.99,
            rating: 4.8,
            reviews_count: 890,
            instructor_name: 'Lokesh Yadav',
            total_students: 2150,
            banner_color: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            icon: '🗄️',
            lessons: [
                {
                    lesson_id: 5,
                    sequence_no: 1,
                    lesson_title: 'Entity Relationship Modeling (ERD)',
                    duration: '28 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Learn how to translate complex business domains into clean relational schemas with proper 1-to-many and many-to-many relationship cardinality.'
                },
                {
                    lesson_id: 6,
                    sequence_no: 2,
                    lesson_title: 'Advanced SQL Joins & Subqueries',
                    duration: '38 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Master complex queries combining INNER JOIN, LEFT JOIN, GROUP BY aggregations, and correlated subqueries for data analytics.'
                }
            ]
        },
        {
            course_id: 3,
            title: 'Modern JavaScript (ES6+ to Async)',
            description: 'Accelerate your frontend mastery with deep insights into event loops, promises, async/await, closures, prototypes, and dynamic DOM manipulation.',
            category: 'JavaScript',
            level: 'All Levels',
            price: 39.99,
            rating: 4.9,
            reviews_count: 1105,
            instructor_name: 'Sarah Jenkins',
            total_students: 2940,
            banner_color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            icon: '⚡',
            lessons: [
                {
                    lesson_id: 7,
                    sequence_no: 1,
                    lesson_title: 'Arrow Functions, Destructuring & Rest/Spread',
                    duration: '20 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Write clean, concise, modern JavaScript code utilizing modern ES6 syntactic sugar and immutable array manipulation methods.'
                },
                {
                    lesson_id: 8,
                    sequence_no: 2,
                    lesson_title: 'Asynchronous JavaScript & Fetch API',
                    duration: '32 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Understand microtasks, macrotasks, Promise chaining, async/await error handling with try/catch, and communicating with REST APIs.'
                }
            ]
        },
        {
            course_id: 4,
            title: 'UI/UX Design Systems with Modern CSS',
            description: 'Craft stunning, responsive, and accessible user interfaces using CSS custom properties, Flexbox, Grid, fluid typography, and glassmorphism techniques.',
            category: 'Design & CSS',
            level: 'Beginner',
            price: 29.99,
            rating: 4.7,
            reviews_count: 650,
            instructor_name: 'Lokesh Yadav',
            total_students: 1800,
            banner_color: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            icon: '🎨',
            lessons: [
                {
                    lesson_id: 9,
                    sequence_no: 1,
                    lesson_title: 'Color Palettes & Typography Scale',
                    duration: '25 mins',
                    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    content: 'Establish design tokens and variables that scale effortlessly across complex multipage web applications.'
                }
            ]
        }
    ]
};

// Authentication state manager
const Auth = {
    getToken: () => localStorage.getItem('lms_token'),
    getUser: () => {
        const u = localStorage.getItem('lms_user');
        return u ? JSON.parse(u) : null;
    },
    setAuth: (token, user) => {
        localStorage.setItem('lms_token', token);
        localStorage.setItem('lms_user', JSON.stringify(user));
    },
    clearAuth: () => {
        localStorage.removeItem('lms_token');
        localStorage.removeItem('lms_user');
    },
    isAuthenticated: () => !!localStorage.getItem('lms_token'),
    logout: () => {
        Auth.clearAuth();
        window.location.href = '/login.html?logout=true';
    }
};

// Enrolled Courses Manager (with localStorage persistence)
const EnrollmentsStore = {
    getEnrollments: () => {
        const stored = localStorage.getItem('lms_enrollments');
        if (stored) return JSON.parse(stored);
        
        const initial = [
            {
                enrollment_id: 1,
                course_id: 1,
                title: 'Full-Stack Web Development Bootcamp',
                category: 'Web Development',
                instructor_name: 'Lokesh Yadav',
                progress: 50,
                status: 'In Progress',
                total_lessons: 4,
                completed_lessons: [1, 2],
                enrollment_date: '2026-11-01'
            },
            {
                enrollment_id: 2,
                course_id: 2,
                title: 'Relational Database Design with MySQL',
                category: 'Databases',
                instructor_name: 'Lokesh Yadav',
                progress: 100,
                status: 'Completed',
                total_lessons: 2,
                completed_lessons: [5, 6],
                enrollment_date: '2026-11-03'
            }
        ];
        localStorage.setItem('lms_enrollments', JSON.stringify(initial));
        return initial;
    },
    enrollCourse: (course) => {
        const list = EnrollmentsStore.getEnrollments();
        if (list.find(e => e.course_id === course.course_id)) {
            return { alreadyEnrolled: true };
        }
        const newEnrollment = {
            enrollment_id: Date.now(),
            course_id: course.course_id,
            title: course.title,
            category: course.category || 'General',
            instructor_name: course.instructor_name || 'Lokesh Yadav',
            progress: 0,
            status: 'In Progress',
            total_lessons: course.lessons ? course.lessons.length : 3,
            completed_lessons: [],
            enrollment_date: new Date().toISOString().split('T')[0]
        };
        list.push(newEnrollment);
        localStorage.setItem('lms_enrollments', JSON.stringify(list));
        return { success: true };
    },
    updateProgress: (courseId, lessonId, isComplete) => {
        const list = EnrollmentsStore.getEnrollments();
        const item = list.find(e => e.course_id === parseInt(courseId, 10));
        if (!item) return;

        if (!item.completed_lessons) item.completed_lessons = [];
        const numLessonId = parseInt(lessonId, 10);

        if (isComplete && !item.completed_lessons.includes(numLessonId)) {
            item.completed_lessons.push(numLessonId);
        } else if (!isComplete && item.completed_lessons.includes(numLessonId)) {
            item.completed_lessons = item.completed_lessons.filter(id => id !== numLessonId);
        }

        const total = item.total_lessons || 1;
        item.progress = Math.min(100, Math.round((item.completed_lessons.length / total) * 100));
        item.status = item.progress >= 100 ? 'Completed' : 'In Progress';

        localStorage.setItem('lms_enrollments', JSON.stringify(list));
        return item;
    }
};

// Unified API Requester (connects directly to backend API)
async function apiRequest(endpoint, method = 'GET', data = null) {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        });

        const json = await response.json();
        return { ok: response.ok, status: response.status, ...json };
    } catch (e) {
        // Network or server unreachable; handle fallback gracefully
        console.warn(`[API] Network error communicating with ${endpoint}:`, e.message);
    }

    // Fallbacks for Course Catalog & Enrollments if database service is restarting
    if (endpoint.startsWith('/courses')) {
        const parts = endpoint.split('/');
        if (parts.length === 3 && !isNaN(parts[2])) {
            const courseId = parseInt(parts[2], 10);
            const course = MOCK_DATA.courses.find(c => c.course_id === courseId);
            return course ? { success: true, data: course } : { success: false, message: 'Course not found' };
        }
        return { success: true, data: MOCK_DATA.courses };
    }

    if (endpoint === '/enrollments/my-courses') {
        return { success: true, data: EnrollmentsStore.getEnrollments() };
    }

    if (endpoint.startsWith('/enrollments/course/')) {
        const courseId = parseInt(endpoint.split('/').pop(), 10);
        const enrollment = EnrollmentsStore.getEnrollments().find(e => e.course_id === courseId);
        if (!enrollment) {
            return { success: false, status: 403, message: 'You are not enrolled in this course.' };
        }
        return { success: true, data: enrollment };
    }

    if (endpoint === '/enrollments' && method === 'POST') {
        const course = MOCK_DATA.courses.find(c => c.course_id === parseInt(data.course_id, 10));
        if (course) {
            const res = EnrollmentsStore.enrollCourse(course);
            return res.alreadyEnrolled 
                ? { success: false, message: 'You are already enrolled in this course.' }
                : { success: true, message: 'Successfully enrolled!' };
        }
    }

    if (endpoint === '/enrollments/progress' && method === 'POST') {
        const updated = EnrollmentsStore.updateProgress(data.course_id, data.lesson_id, data.is_completed);
        if (!updated) {
            return { success: false, status: 404, message: 'Enrollment record not found. You can only update your own course progress.' };
        }
        return {
            success: true,
            progress: updated.progress,
            status: updated.status,
            completed_lessons: updated.completed_lessons || [],
            completed_count: (updated.completed_lessons || []).length,
            total_lessons: updated.total_lessons,
            course_id: updated.course_id,
            data: updated
        };
    }

    if (endpoint === '/users/stats') {
        return {
            success: true,
            stats: {
                total_courses: MOCK_DATA.courses.length,
                total_students: 125,
                total_enrollments: 240
            }
        };
    }

    return { success: false, message: 'Unable to connect to backend server. Please make sure the server is running.' };
}

// Client-Side Role-Based Page Access Guard
function enforceRoleAccess() {
    const path = window.location.pathname;
    const user = Auth.getUser();
    const isAuth = Auth.isAuthenticated();

    // Instructor Protected Pages
    const instructorPages = ['/instructor-dashboard.html', '/instructor-dashboard', '/create-course.html', '/create-course'];
    if (instructorPages.includes(path)) {
        if (!isAuth) {
            window.location.href = `/login.html?error=unauthorized&redirect=${encodeURIComponent(path)}`;
            return;
        }
        if (user.role !== 'instructor' && user.role !== 'admin') {
            alert('Access Denied: The Instructor Studio is restricted to Instructor accounts.');
            window.location.href = '/student-dashboard.html?error=instructor_only';
            return;
        }
    }

    // Student Protected Pages
    const studentPages = ['/student-dashboard.html', '/student-dashboard', '/my-courses.html', '/my-courses', '/lesson.html', '/lesson'];
    if (studentPages.includes(path)) {
        if (!isAuth) {
            window.location.href = `/login.html?error=unauthorized&redirect=${encodeURIComponent(path)}`;
            return;
        }
    }
}

// Global UI Initialization
document.addEventListener('DOMContentLoaded', () => {
    // 1. Run access guard
    enforceRoleAccess();

    // 2. Mobile navigation toggler
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks') || document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('show');
            const container = navToggle.closest('.nav-container');
            if (container) container.classList.toggle('menu-open');
        });
    }

    // 3. Dynamic navbar navigation links & active state
    const user = Auth.getUser();
    const navActions = document.getElementById('navActions');
    const currentPath = window.location.pathname;

    if (navLinks) {
        const links = navLinks.querySelectorAll('a');
        links.forEach(l => {
            const href = l.getAttribute('href');
            if (href === currentPath || (currentPath === '/' && href === '/index.html')) {
                l.classList.add('active');
            }
        });
    }

    // Dynamic Auth / Dashboard buttons in navigation
    if (navActions) {
        if (user) {
            const dashboardLink = user.role === 'instructor' ? '/instructor-dashboard.html' : '/student-dashboard.html';
            navActions.innerHTML = `
                <a href="${dashboardLink}" class="user-badge-pill">
                    <span class="user-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                    <span class="user-name">${user.name || 'User'}</span>
                    <span class="user-role">${user.role || 'student'}</span>
                </a>
                <button id="globalLogoutBtn" class="btn btn-secondary btn-sm">Log Out</button>
            `;

            const logoutBtn = document.getElementById('globalLogoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    Auth.logout();
                });
            }
        } else {
            navActions.innerHTML = `
                <a href="/login.html" class="btn btn-secondary btn-sm">Sign In</a>
                <a href="/register.html" class="btn btn-primary btn-sm">Get Started</a>
            `;
        }
    }

    // Global Logout buttons inside dashboard sidebars
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
});
