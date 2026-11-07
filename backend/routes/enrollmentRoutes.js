const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Students enroll and update only their own progress. Reads are limited to the signed-in user.
router.post('/', verifyToken, requireRole('student'), enrollmentController.enrollCourse);
router.get('/my-courses', verifyToken, enrollmentController.getStudentEnrollments);
router.get('/course/:courseId', verifyToken, enrollmentController.getCourseEnrollment);
router.post('/progress', verifyToken, requireRole('student'), enrollmentController.updateCourseProgress);

module.exports = router;
