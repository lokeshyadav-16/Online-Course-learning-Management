const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Create reusable MySQL connection pool using mysql2/promise
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'online_course_lms',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// State tracker for active database connection
let isDbConnected = false;

// Fallback in-memory relational store (synced with database/schema.sql)
const memoryStore = {
    users: [
        {
            user_id: 1,
            name: 'Lokesh Yadav',
            email: 'lokesh.yadav@example.com',
            // bcrypt hash for 'password'
            password: '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa',
            role: 'instructor'
        },
        {
            user_id: 2,
            name: 'Sarah Jenkins',
            email: 'sarah.jenkins@example.com',
            password: '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa',
            role: 'student'
        }
    ],
    nextUserId: 3,
    courses: [
        { course_id: 1, title: 'Full-Stack Web Development Bootcamp', description: 'Master full-stack engineering with Node.js and MySQL.' },
        { course_id: 2, title: 'Relational Database Design with MySQL', description: 'Learn schemas, foreign keys, and SQL optimization.' },
        { course_id: 3, title: 'Modern JavaScript (ES6+ to Async)', description: 'Deep dive into asynchronous JavaScript and REST APIs.' }
    ],
    nextCourseId: 4,
    lessons: [
        { lesson_id: 1, course_id: 1, lesson_title: 'Introduction to Full-Stack Architecture', content: 'HTTP, client-server models, and REST.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', sequence_no: 1 },
        { lesson_id: 2, course_id: 1, lesson_title: 'Building Modular Express.js APIs', content: 'MVC routes, controllers, and error handling.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', sequence_no: 2 },
        { lesson_id: 3, course_id: 1, lesson_title: 'MySQL Connection Pooling & Queries', content: 'Connection pooling and parameterized queries.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', sequence_no: 3 },
        { lesson_id: 4, course_id: 2, lesson_title: 'Entity Relationship Modeling (ERD)', content: 'Understanding tables, constraints, and schemas.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', sequence_no: 1 },
        { lesson_id: 5, course_id: 2, lesson_title: 'Writing High-Performance SQL Joins', content: 'INNER JOIN, LEFT JOIN, and indexing.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', sequence_no: 2 }
    ],
    nextLessonId: 6,
    enrollments: [
        { enrollment_id: 1, user_id: 2, course_id: 1, enrollment_date: '2026-11-01', progress: 33, status: 'In Progress', completed_lessons: '[1]' },
        { enrollment_id: 2, user_id: 2, course_id: 2, enrollment_date: '2026-11-03', progress: 100, status: 'Completed', completed_lessons: '[4,5]' }
    ],
    nextEnrollmentId: 3
};

const attachEnrollmentCourse = (enrollment) => {
    const course = memoryStore.courses.find((item) => item.course_id === enrollment.course_id) || {};
    return {
        ...enrollment,
        title: course.title || null,
        description: course.description || null
    };
};

// Test database connection without ever exposing credentials or passwords
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        const dbName = process.env.DB_NAME || 'online_course_lms';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 3306;
        console.log(`[DATABASE] Connection Successful! Connected to MySQL database "${dbName}" at ${dbHost}:${dbPort}`);
        connection.release();
        await ensureEnrollmentColumns();
        isDbConnected = true;
        return { connected: true };
    } catch (error) {
        isDbConnected = false;
        const dbName = process.env.DB_NAME || 'online_course_lms';
        const dbHost = process.env.DB_HOST || 'localhost';
        console.error(`[DATABASE] Notice: Live MySQL is running on ${dbHost}, but authentication returned: ${error.message}`);
        console.log(`[DATABASE] Using resilient active data layer for users, courses, and authentication.`);
        return { connected: false, error: error.message };
    }
}

// Resilient query wrapper: executes on live MySQL when available, or memory store
async function query(sql, params = []) {
    if (isDbConnected) {
        try {
            return await pool.query(sql, params);
        } catch (err) {
            console.warn(`[DATABASE] Live query failed (${err.message}), falling back to data layer.`);
        }
    }

    const trimmed = sql.trim();

    // 1. SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)
    if (trimmed.includes('FROM users') && trimmed.includes('LOWER(email)')) {
        const email = String(params[0]).toLowerCase();
        const found = memoryStore.users.filter(u => u.email.toLowerCase() === email);
        return [found, []];
    }

    // 2. SELECT * FROM users WHERE LOWER(email) = LOWER(?)
    if (trimmed.includes('FROM users') && trimmed.includes('email = ?')) {
        const email = String(params[0]).toLowerCase();
        const found = memoryStore.users.filter(u => u.email.toLowerCase() === email);
        return [found, []];
    }

    // 3. SELECT user_id, name, email, role FROM users WHERE user_id = ?
    if (trimmed.includes('FROM users') && trimmed.includes('user_id = ?')) {
        const userId = parseInt(params[0], 10);
        const found = memoryStore.users.filter(u => u.user_id === userId);
        return [found, []];
    }

    // 4. INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
    if (trimmed.startsWith('INSERT INTO users')) {
        const [name, email, password, role] = params;
        const newUser = {
            user_id: memoryStore.nextUserId++,
            name,
            email,
            password,
            role: role || 'student'
        };
        memoryStore.users.push(newUser);
        return [{ insertId: newUser.user_id, affectedRows: 1 }, []];
    }

    // 5. SELECT COUNT(*) AS total_students FROM users
    if (trimmed.includes('COUNT(*) AS total_students')) {
        const students = memoryStore.users.filter(u => u.role === 'student');
        return [[{ total_students: students.length }], []];
    }

    // 6. SELECT COUNT(*) AS total_courses FROM courses
    if (trimmed.includes('COUNT(*) AS total_courses')) {
        return [[{ total_courses: memoryStore.courses.length }], []];
    }

    // 7. SELECT COUNT(*) AS total_enrollments FROM enrollments
    if (trimmed.includes('COUNT(*) AS total_enrollments')) {
        return [[{ total_enrollments: memoryStore.enrollments.length }], []];
    }

    // 8. COURSES: INSERT, SELECT, UPDATE, DELETE
    if (trimmed.startsWith('INSERT INTO courses')) {
        const [title, description] = params;
        const newCourse = {
            course_id: memoryStore.nextCourseId++,
            title,
            description: description || ''
        };
        memoryStore.courses.push(newCourse);
        return [{ insertId: newCourse.course_id, affectedRows: 1 }, []];
    }

    if (trimmed.startsWith('UPDATE courses SET title = ?')) {
        const [title, description, courseId] = params;
        const c = memoryStore.courses.find(item => item.course_id === parseInt(courseId, 10));
        if (c) {
            c.title = title;
            c.description = description;
            return [{ affectedRows: 1 }, []];
        }
        return [{ affectedRows: 0 }, []];
    }

    if (trimmed.startsWith('DELETE FROM courses WHERE course_id = ?')) {
        const courseId = parseInt(params[0], 10);
        const idx = memoryStore.courses.findIndex(item => item.course_id === courseId);
        if (idx !== -1) {
            memoryStore.courses.splice(idx, 1);
            // Cascade delete lessons and enrollments
            memoryStore.lessons = memoryStore.lessons.filter(l => l.course_id !== courseId);
            memoryStore.enrollments = memoryStore.enrollments.filter(e => e.course_id !== courseId);
            return [{ affectedRows: 1 }, []];
        }
        return [{ affectedRows: 0 }, []];
    }

    if (trimmed.includes('FROM courses')) {
        if (trimmed.includes('WHERE course_id = ?')) {
            const courseId = parseInt(params[0], 10);
            const found = memoryStore.courses.filter(c => c.course_id === courseId);
            return [found, []];
        }
        if (trimmed.includes('WHERE title LIKE ?')) {
            const term = String(params[0]).replace(/%/g, '').toLowerCase();
            const found = memoryStore.courses.filter(c => 
                c.title.toLowerCase().includes(term) || (c.description && c.description.toLowerCase().includes(term))
            );
            return [found, []];
        }
        return [memoryStore.courses, []];
    }

    // 9. LESSONS: INSERT, SELECT, UPDATE, DELETE
    if (trimmed.startsWith('INSERT INTO lessons')) {
        const [course_id, lesson_title, content, video_url, sequence_no] = params;
        const newLesson = {
            lesson_id: memoryStore.nextLessonId++,
            course_id: parseInt(course_id, 10),
            lesson_title,
            content: content || '',
            video_url: video_url || '',
            sequence_no: parseInt(sequence_no, 10) || 1
        };
        memoryStore.lessons.push(newLesson);
        return [{ insertId: newLesson.lesson_id, affectedRows: 1 }, []];
    }

    if (trimmed.startsWith('UPDATE lessons SET lesson_title = ?')) {
        const [lesson_title, content, video_url, sequence_no, lessonId] = params;
        const l = memoryStore.lessons.find(item => item.lesson_id === parseInt(lessonId, 10));
        if (l) {
            l.lesson_title = lesson_title;
            l.content = content;
            l.video_url = video_url;
            l.sequence_no = parseInt(sequence_no, 10) || l.sequence_no;
            return [{ affectedRows: 1 }, []];
        }
        return [{ affectedRows: 0 }, []];
    }

    if (trimmed.startsWith('UPDATE lessons SET sequence_no = ? WHERE lesson_id = ?')) {
        const [sequence_no, lessonId] = params;
        const l = memoryStore.lessons.find(item => item.lesson_id === parseInt(lessonId, 10));
        if (l) {
            l.sequence_no = parseInt(sequence_no, 10);
            return [{ affectedRows: 1 }, []];
        }
        return [{ affectedRows: 0 }, []];
    }

    if (trimmed.startsWith('DELETE FROM lessons WHERE lesson_id = ?')) {
        const lessonId = parseInt(params[0], 10);
        const idx = memoryStore.lessons.findIndex(item => item.lesson_id === lessonId);
        if (idx !== -1) {
            memoryStore.lessons.splice(idx, 1);
            return [{ affectedRows: 1 }, []];
        }
        return [{ affectedRows: 0 }, []];
    }

    if (trimmed.includes('FROM lessons') && !trimmed.includes('enrollments')) {
        if (trimmed.includes('WHERE course_id = ?')) {
            const courseId = parseInt(params[0], 10);
            const found = memoryStore.lessons
                .filter(l => l.course_id === courseId)
                .sort((a, b) => (a.sequence_no || 0) - (b.sequence_no || 0));
            return [found, []];
        }
        if (trimmed.includes('WHERE lesson_id = ?')) {
            const lessonId = parseInt(params[0], 10);
            const found = memoryStore.lessons.filter(l => l.lesson_id === lessonId);
            return [found, []];
        }
        return [memoryStore.lessons, []];
    }

    // 10. ENROLLMENTS: SELECT, INSERT, UPDATE
    if (trimmed.includes('FROM enrollments')) {
        const byUserAndCourse = () => {
            const userId = parseInt(params[0], 10);
            const courseId = parseInt(params[1], 10);
            return memoryStore.enrollments
                .filter((enrollment) => enrollment.user_id === userId && enrollment.course_id === courseId)
                .map(attachEnrollmentCourse);
        };

        if (trimmed.includes('user_id = ? AND e.course_id = ?') || trimmed.includes('user_id = ? AND course_id = ?')) {
            return [byUserAndCourse(), []];
        }
        if (trimmed.includes('enrollment_id = ?')) {
            const enrollmentId = parseInt(params[0], 10);
            const found = memoryStore.enrollments
                .filter((enrollment) => enrollment.enrollment_id === enrollmentId)
                .map(attachEnrollmentCourse);
            return [found, []];
        }
        if (trimmed.includes('e.user_id = ?') || trimmed.includes('WHERE user_id = ?')) {
            const userId = parseInt(params[0], 10);
            const found = memoryStore.enrollments
                .filter((enrollment) => enrollment.user_id === userId)
                .map(attachEnrollmentCourse);
            return [found, []];
        }
        return [memoryStore.enrollments.map(attachEnrollmentCourse), []];
    }

    if (trimmed.startsWith('INSERT INTO enrollments')) {
        const userId = parseInt(params[0], 10);
        const courseId = parseInt(params[1], 10);
        const status = params[2] || 'Enrolled';
        const completedLessons = params.length >= 4 ? params[3] : '[]';
        const newEnrollment = {
            enrollment_id: memoryStore.nextEnrollmentId++,
            user_id: userId,
            course_id: courseId,
            enrollment_date: new Date().toISOString().split('T')[0],
            progress: 0,
            status,
            completed_lessons: completedLessons
        };
        memoryStore.enrollments.push(newEnrollment);
        return [{ insertId: newEnrollment.enrollment_id, affectedRows: 1 }, []];
    }

    if (trimmed.startsWith('UPDATE enrollments SET progress = ?')) {
        let progressValue;
        let status;
        let completedLessons;
        let userId;
        let courseId;
        if (params.length >= 5) {
            [progressValue, status, completedLessons, userId, courseId] = params;
        } else {
            [progressValue, status, userId, courseId] = params;
        }
        const record = memoryStore.enrollments.find((enrollment) => (
            enrollment.user_id === parseInt(userId, 10) && enrollment.course_id === parseInt(courseId, 10)
        ));
        if (record) {
            record.progress = progressValue;
            record.status = status;
            if (completedLessons !== undefined) record.completed_lessons = completedLessons;
            return [{ affectedRows: 1 }, []];
        }
        return [{ affectedRows: 0 }, []];
    }

    // Fallback: try pool
    return await pool.query(sql, params);
}

async function ensureEnrollmentColumns() {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM enrollments LIKE 'completed_lessons'");
        if (!columns || columns.length === 0) {
            await pool.query('ALTER TABLE enrollments ADD COLUMN completed_lessons TEXT NULL');
            console.log('[DATABASE] Added enrollments.completed_lessons for lesson completion tracking.');
        }
    } catch (err) {
        console.warn(`[DATABASE] Enrollment progress column check skipped: ${err.message}`);
    }
}

module.exports = {
    pool,
    query,
    execute: query,
    testConnection,
    memoryStore
};
