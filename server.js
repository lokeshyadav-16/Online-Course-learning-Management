const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });
dotenv.config();

const { testConnection, query } = require('./backend/configuration/db');
const errorHandler = require('./backend/middleware/errorHandler');

// Import modular API route handlers
const authRoutes = require('./backend/routes/authRoutes');
const courseRoutes = require('./backend/routes/courseRoutes');
const lessonRoutes = require('./backend/routes/lessonRoutes');
const enrollmentRoutes = require('./backend/routes/enrollmentRoutes');
const userRoutes = require('./backend/routes/userRoutes');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure JSON and URL-encoded body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public folder
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve frontend static assets (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'frontend')));

// API Health Check
app.get('/api/health', async (req, res) => {
    let databaseStatus = 'disconnected';
    try {
        await query('SELECT 1');
        databaseStatus = 'connected';
    } catch (err) {
        databaseStatus = 'disconnected';
    }

    res.json({
        status: 'online',
        database: databaseStatus,
        system: 'Online Course Learning Management System',
        author: 'Lokesh Yadav',
        timestamp: new Date().toISOString()
    });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/users', userRoutes);

// Clean URL Route Mappings for all 9 pages
const pages = [
    { route: '/', file: 'index.html' },
    { route: '/login', file: 'login.html' },
    { route: '/register', file: 'register.html' },
    { route: '/courses', file: 'courses.html' },
    { route: '/course-details', file: 'course-details.html' },
    { route: '/student-dashboard', file: 'student-dashboard.html' },
    { route: '/instructor-dashboard', file: 'instructor-dashboard.html' },
    { route: '/my-courses', file: 'my-courses.html' },
    { route: '/lesson', file: 'lesson.html' },
    { route: '/create-course', file: 'create-course.html' }
];

pages.forEach(({ route, file }) => {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend', file));
    });
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server and test database connection
const server = app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(` Online Course Learning Management System`);
    console.log(` Author/Owner: Lokesh Yadav`);
    console.log(` Server running at: http://localhost:${PORT}`);
    console.log(` API Health Check:  http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);

    // Test MySQL database connection on startup
    await testConnection();
});

module.exports = app;
