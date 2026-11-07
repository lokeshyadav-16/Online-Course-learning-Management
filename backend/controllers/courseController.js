const db = require('../configuration/db');
const jwt = require('jsonwebtoken');

// @desc    Get all courses (with optional search)
// @route   GET /api/courses
const getAllCourses = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = 'SELECT course_id, title, description FROM courses';
        const params = [];

        if (search) {
            query += ' WHERE title LIKE ? OR description LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY course_id ASC';

        const [courses] = await db.query(query, params);

        // Attach lesson count to each course
        const coursesWithCount = await Promise.all(
            courses.map(async (c) => {
                const [lessons] = await db.query('SELECT lesson_id FROM lessons WHERE course_id = ?', [c.course_id]);
                return {
                    ...c,
                    total_lessons: lessons.length
                };
            })
        );

        res.json({ success: true, count: coursesWithCount.length, data: coursesWithCount });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single course by ID (checks optional auth for enrollment status)
// @route   GET /api/courses/:id
const getCourseById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [courses] = await db.query(
            'SELECT course_id, title, description FROM courses WHERE course_id = ?',
            [id]
        );

        if (courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const course = courses[0];

        // Check total lesson count
        const [allLessons] = await db.query(
            'SELECT lesson_id, course_id, lesson_title, content, video_url, sequence_no FROM lessons WHERE course_id = ? ORDER BY sequence_no ASC',
            [id]
        );

        // Check optional authorization header
        let isEnrolled = false;
        let userRole = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lms_secret_key');
                userRole = decoded.role;

                if (userRole === 'instructor' || userRole === 'admin') {
                    isEnrolled = true;
                } else if (userRole === 'student') {
                    const [enrollment] = await db.query(
                        'SELECT enrollment_id FROM enrollments WHERE user_id = ? AND course_id = ?',
                        [decoded.user_id, id]
                    );
                    isEnrolled = enrollment.length > 0;
                }
            } catch (e) {
                // Ignore invalid token on optional public route
            }
        }

        res.json({
            success: true,
            data: {
                ...course,
                total_lessons: allLessons.length,
                is_enrolled: isEnrolled,
                // Only provide lesson list if student is enrolled or instructor
                lessons: isEnrolled 
                    ? allLessons 
                    : allLessons.map(l => ({
                        lesson_id: l.lesson_id,
                        sequence_no: l.sequence_no,
                        lesson_title: l.lesson_title,
                        is_locked: true
                    }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new course (Instructor only)
// @route   POST /api/courses
const createCourse = async (req, res, next) => {
    try {
        const { title, description } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Course title is required.' });
        }

        const [result] = await db.query(
            'INSERT INTO courses (title, description) VALUES (?, ?)',
            [title.trim(), description ? description.trim() : '']
        );

        res.status(201).json({
            success: true,
            message: 'Course created successfully!',
            course_id: result.insertId,
            data: {
                course_id: result.insertId,
                title: title.trim(),
                description: description ? description.trim() : ''
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update course details (title, description)
// @route   PUT /api/courses/:id
const updateCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;

        const [existing] = await db.query('SELECT * FROM courses WHERE course_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const newTitle = title !== undefined ? title.trim() : existing[0].title;
        const newDesc = description !== undefined ? description.trim() : existing[0].description;

        if (!newTitle) {
            return res.status(400).json({ success: false, message: 'Course title cannot be empty.' });
        }

        await db.query(
            'UPDATE courses SET title = ?, description = ? WHERE course_id = ?',
            [newTitle, newDesc, id]
        );

        res.json({
            success: true,
            message: 'Course updated successfully!',
            data: {
                course_id: parseInt(id, 10),
                title: newTitle,
                description: newDesc
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a course (and cascade delete lessons & enrollments)
// @route   DELETE /api/courses/:id
const deleteCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM courses WHERE course_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        res.json({ success: true, message: 'Course and all associated lessons deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};
