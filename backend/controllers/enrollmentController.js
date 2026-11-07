const db = require('../configuration/db');

const parseCompletedLessons = (value) => {
    if (value === null || value === undefined || value === '') return [];
    if (Array.isArray(value)) {
        return value.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
    }
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
    } catch (error) {
        return [];
    }
};

const formatDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return String(value).slice(0, 10);
};

const deriveStatus = (progress) => {
    if (progress >= 100) return 'Completed';
    if (progress <= 0) return 'Enrolled';
    return 'In Progress';
};

const calculateProgress = (completedCount, totalLessons) => {
    if (!totalLessons) return 0;
    return Math.min(100, Math.round((completedCount / totalLessons) * 100));
};

const getAuthUserId = (req) => parseInt(req.user.user_id || req.user.id, 10);

const loadCourseLessons = async (courseId) => {
    const [lessons] = await db.query(
        'SELECT lesson_id FROM lessons WHERE course_id = ?',
        [courseId]
    );
    return lessons.map((lesson) => parseInt(lesson.lesson_id, 10));
};

const buildEnrollmentView = async (row) => {
    const courseId = parseInt(row.course_id, 10);
    const lessonIds = await loadCourseLessons(courseId);
    const hasTrackedLessons = row.completed_lessons !== null && row.completed_lessons !== undefined;
    let completed = hasTrackedLessons ? parseCompletedLessons(row.completed_lessons) : [];
    completed = [...new Set(completed.filter((id) => lessonIds.includes(id)))];

    let progress = parseInt(row.progress, 10) || 0;
    let status = row.status || 'Enrolled';

    if (hasTrackedLessons) {
        progress = calculateProgress(completed.length, lessonIds.length);
        status = deriveStatus(progress);
    }

    return {
        enrollment_id: row.enrollment_id,
        user_id: parseInt(row.user_id, 10),
        course_id: courseId,
        enrollment_date: formatDate(row.enrollment_date),
        progress,
        status,
        title: row.title || null,
        description: row.description || null,
        total_lessons: lessonIds.length,
        completed_lessons: completed,
        completed_count: completed.length
    };
};

const saveProgress = async (userId, courseId, completed, lessonIds) => {
    const progress = calculateProgress(completed.length, lessonIds.length);
    const status = deriveStatus(progress);
    const [result] = await db.query(
        'UPDATE enrollments SET progress = ?, status = ?, completed_lessons = ? WHERE user_id = ? AND course_id = ?',
        [progress, status, JSON.stringify(completed), userId, courseId]
    );
    return { result, progress, status };
};

// @desc    Enroll the signed-in student in a course
// @route   POST /api/enrollments
const enrollCourse = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const courseId = parseInt(req.body.course_id, 10);

        if (!courseId || Number.isNaN(courseId)) {
            return res.status(400).json({ success: false, message: 'Course ID is required' });
        }

        const [course] = await db.query(
            'SELECT course_id, title, description FROM courses WHERE course_id = ?',
            [courseId]
        );
        if (course.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const [existing] = await db.query(
            'SELECT enrollment_id FROM enrollments WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Already enrolled in this course'
            });
        }

        let result;
        try {
            [result] = await db.query(
                'INSERT INTO enrollments (user_id, course_id, enrollment_date, progress, status, completed_lessons) VALUES (?, ?, CURRENT_DATE, 0, ?, ?)',
                [userId, courseId, 'Enrolled', '[]']
            );
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Already enrolled in this course'
                });
            }
            throw error;
        }

        const [created] = await db.query(
            'SELECT enrollment_id, user_id, course_id, enrollment_date, progress, status, completed_lessons FROM enrollments WHERE enrollment_id = ?',
            [result.insertId]
        );

        const view = await buildEnrollmentView({
            ...(created[0] || {}),
            enrollment_id: result.insertId,
            user_id: userId,
            course_id: courseId,
            enrollment_date: created[0] ? created[0].enrollment_date : new Date(),
            progress: 0,
            status: 'Enrolled',
            completed_lessons: '[]',
            title: course[0].title,
            description: course[0].description
        });

        res.status(201).json({
            success: true,
            message: 'Enrolled in course successfully',
            enrollment_id: view.enrollment_id,
            data: view
        });
    } catch (error) {
        next(error);
    }
};

// @desc    List the signed-in student's enrollments
// @route   GET /api/enrollments/my-courses
const getStudentEnrollments = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const [enrollments] = await db.query(`
            SELECT e.enrollment_id, e.user_id, e.course_id, e.enrollment_date, e.progress, e.status, e.completed_lessons,
                   c.title, c.description
            FROM enrollments e
            JOIN courses c ON e.course_id = c.course_id
            WHERE e.user_id = ?
            ORDER BY e.enrollment_date DESC, e.enrollment_id DESC
        `, [userId]);

        const data = [];
        for (const row of enrollments) {
            data.push(await buildEnrollmentView(row));
        }

        res.json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Get the signed-in student's enrollment for one course
// @route   GET /api/enrollments/course/:courseId
const getCourseEnrollment = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const courseId = parseInt(req.params.courseId, 10);

        if (!courseId || Number.isNaN(courseId)) {
            return res.status(400).json({ success: false, message: 'Course ID is required' });
        }

        const [rows] = await db.query(`
            SELECT e.enrollment_id, e.user_id, e.course_id, e.enrollment_date, e.progress, e.status, e.completed_lessons,
                   c.title, c.description
            FROM enrollments e
            JOIN courses c ON e.course_id = c.course_id
            WHERE e.user_id = ? AND e.course_id = ?
        `, [userId, courseId]);

        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not enrolled in this course.'
            });
        }

        const data = await buildEnrollmentView(rows[0]);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark a lesson complete or incomplete and recalculate this student's progress
// @route   POST /api/enrollments/progress
const updateCourseProgress = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const courseId = parseInt(req.body.course_id, 10);
        const lessonId = parseInt(req.body.lesson_id, 10);
        const { is_completed: isCompleted } = req.body;

        if (!courseId || Number.isNaN(courseId) || !lessonId || Number.isNaN(lessonId) || typeof isCompleted !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Course ID, lesson ID, and completion state are required. Progress is calculated from completed lessons.'
            });
        }

        const [enrollment] = await db.query(
            'SELECT enrollment_id, user_id, course_id, enrollment_date, progress, status, completed_lessons FROM enrollments WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );
        if (enrollment.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment record not found. You can only update your own course progress.'
            });
        }

        const [lessons] = await db.query(
            'SELECT lesson_id, course_id FROM lessons WHERE lesson_id = ?',
            [lessonId]
        );
        if (lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }
        if (parseInt(lessons[0].course_id, 10) !== courseId) {
            return res.status(400).json({
                success: false,
                message: 'This lesson does not belong to the enrolled course.'
            });
        }

        const lessonIds = await loadCourseLessons(courseId);
        let completed = parseCompletedLessons(enrollment[0].completed_lessons).filter((id) => lessonIds.includes(id));

        if (isCompleted && !completed.includes(lessonId)) {
            completed.push(lessonId);
        }
        if (!isCompleted) {
            completed = completed.filter((id) => id !== lessonId);
        }

        const { result, progress, status } = await saveProgress(userId, courseId, completed, lessonIds);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment record not found. You can only update your own course progress.'
            });
        }

        res.json({
            success: true,
            message: 'Progress updated successfully',
            progress,
            status,
            completed_lessons: completed,
            completed_count: completed.length,
            total_lessons: lessonIds.length,
            enrollment_date: formatDate(enrollment[0].enrollment_date),
            course_id: courseId
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    enrollCourse,
    getStudentEnrollments,
    getCourseEnrollment,
    updateCourseProgress
};
