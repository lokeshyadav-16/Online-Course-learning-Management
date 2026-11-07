const db = require('../configuration/db');

// @desc    Get all lessons for a specific course (Students must be enrolled; Instructors can always view)
// @route   GET /api/lessons/course/:courseId
const getLessonsByCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.user_id || req.user.id;
        const userRole = (req.user.role || '').toLowerCase();

        // 1. Verify course exists
        const [course] = await db.query('SELECT course_id, title FROM courses WHERE course_id = ?', [courseId]);
        if (course.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        // 2. Authorization check: If user is a student, verify enrollment
        if (userRole === 'student') {
            const [enrollment] = await db.query(
                'SELECT enrollment_id FROM enrollments WHERE user_id = ? AND course_id = ?',
                [userId, courseId]
            );

            if (enrollment.length === 0) {
                return res.status(403).json({
                    success: false,
                    is_enrolled: false,
                    message: 'Enrollment required. You must enroll in this course to view the lesson list and study materials.'
                });
            }
        }

        // 3. Return lessons ordered by sequence_no
        const [lessons] = await db.query(
            'SELECT lesson_id, course_id, lesson_title, content, video_url, sequence_no FROM lessons WHERE course_id = ? ORDER BY sequence_no ASC',
            [courseId]
        );

        res.json({
            success: true,
            is_enrolled: true,
            count: lessons.length,
            data: lessons
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single lesson
// @route   GET /api/lessons/:id
const getLessonById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [lessons] = await db.query(
            'SELECT lesson_id, course_id, lesson_title, content, video_url, sequence_no FROM lessons WHERE lesson_id = ?',
            [id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        const lesson = lessons[0];
        const userId = req.user.user_id || req.user.id;
        const userRole = (req.user.role || '').toLowerCase();

        // If student, check enrollment
        if (userRole === 'student') {
            const [enrollment] = await db.query(
                'SELECT enrollment_id FROM enrollments WHERE user_id = ? AND course_id = ?',
                [userId, lesson.course_id]
            );

            if (enrollment.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Enrollment required. You must be enrolled in this course to view lesson details.'
                });
            }
        }

        res.json({
            success: true,
            data: lesson
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new lesson under a course (Instructor only)
// @route   POST /api/lessons
const createLesson = async (req, res, next) => {
    try {
        const { course_id, lesson_title, content, video_url, sequence_no } = req.body;

        if (!course_id || !lesson_title) {
            return res.status(400).json({
                success: false,
                message: 'Course ID and Lesson Title are required.'
            });
        }

        // Verify course exists
        const [course] = await db.query('SELECT course_id FROM courses WHERE course_id = ?', [course_id]);
        if (course.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        // Determine next sequence_no if not provided
        let seq = parseInt(sequence_no, 10);
        if (isNaN(seq) || seq <= 0) {
            const [existingLessons] = await db.query(
                'SELECT sequence_no FROM lessons WHERE course_id = ? ORDER BY sequence_no DESC',
                [course_id]
            );
            seq = existingLessons.length > 0 ? (existingLessons[0].sequence_no || 0) + 1 : 1;
        }

        const [result] = await db.query(
            'INSERT INTO lessons (course_id, lesson_title, content, video_url, sequence_no) VALUES (?, ?, ?, ?, ?)',
            [course_id, lesson_title.trim(), content || '', video_url || '', seq]
        );

        res.status(201).json({
            success: true,
            message: 'Lesson created successfully!',
            lesson_id: result.insertId,
            data: {
                lesson_id: result.insertId,
                course_id: parseInt(course_id, 10),
                lesson_title: lesson_title.trim(),
                content: content || '',
                video_url: video_url || '',
                sequence_no: seq
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a lesson (title, content, video_url, sequence_no)
// @route   PUT /api/lessons/:id
const updateLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { lesson_title, content, video_url, sequence_no } = req.body;

        const [existing] = await db.query('SELECT * FROM lessons WHERE lesson_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        const current = existing[0];
        const newTitle = lesson_title !== undefined ? lesson_title.trim() : current.lesson_title;
        const newContent = content !== undefined ? content : current.content;
        const newVideoUrl = video_url !== undefined ? video_url : current.video_url;
        const newSeq = sequence_no !== undefined ? parseInt(sequence_no, 10) : current.sequence_no;

        await db.query(
            'UPDATE lessons SET lesson_title = ?, content = ?, video_url = ?, sequence_no = ? WHERE lesson_id = ?',
            [newTitle, newContent, newVideoUrl, newSeq, id]
        );

        res.json({
            success: true,
            message: 'Lesson updated successfully!',
            data: {
                lesson_id: parseInt(id, 10),
                course_id: current.course_id,
                lesson_title: newTitle,
                content: newContent,
                video_url: newVideoUrl,
                sequence_no: newSeq
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Arrange / Reorder lessons sequence
// @route   PUT /api/lessons/reorder/:courseId
const reorderLessons = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { lessonOrder } = req.body; // Array of { lesson_id, sequence_no }

        if (!Array.isArray(lessonOrder) || lessonOrder.length === 0) {
            return res.status(400).json({ success: false, message: 'lessonOrder array is required.' });
        }

        for (const item of lessonOrder) {
            if (item.lesson_id && item.sequence_no !== undefined) {
                await db.query(
                    'UPDATE lessons SET sequence_no = ? WHERE lesson_id = ?',
                    [parseInt(item.sequence_no, 10), parseInt(item.lesson_id, 10)]
                );
            }
        }

        const [lessons] = await db.query(
            'SELECT lesson_id, course_id, lesson_title, content, video_url, sequence_no FROM lessons WHERE course_id = ? ORDER BY sequence_no ASC',
            [courseId]
        );

        res.json({
            success: true,
            message: 'Lessons rearranged successfully!',
            data: lessons
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a lesson (Instructor only)
// @route   DELETE /api/lessons/:id
const deleteLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM lessons WHERE lesson_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }
        res.json({ success: true, message: 'Lesson deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLessonsByCourse,
    getLessonById,
    createLesson,
    updateLesson,
    reorderLessons,
    deleteLesson
};
