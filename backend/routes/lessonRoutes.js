const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Get lessons for course (Enrollment checked in controller for students; always open for instructors)
router.get('/course/:courseId', verifyToken, lessonController.getLessonsByCourse);
router.get('/:id', verifyToken, lessonController.getLessonById);

// Instructor lesson management routes
router.post(
    '/',
    verifyToken,
    requireRole('instructor', 'admin'),
    lessonController.createLesson
);

router.put(
    '/reorder/:courseId',
    verifyToken,
    requireRole('instructor', 'admin'),
    lessonController.reorderLessons
);

router.put(
    '/:id',
    verifyToken,
    requireRole('instructor', 'admin'),
    lessonController.updateLesson
);

router.delete(
    '/:id',
    verifyToken,
    requireRole('instructor', 'admin'),
    lessonController.deleteLesson
);

module.exports = router;
