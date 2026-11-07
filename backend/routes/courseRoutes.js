const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public course browsing routes
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);

// Protected instructor course management routes
router.post(
    '/',
    verifyToken,
    requireRole('instructor', 'admin'),
    courseController.createCourse
);

router.put(
    '/:id',
    verifyToken,
    requireRole('instructor', 'admin'),
    courseController.updateCourse
);

router.delete(
    '/:id',
    verifyToken,
    requireRole('instructor', 'admin'),
    courseController.deleteCourse
);

module.exports = router;
