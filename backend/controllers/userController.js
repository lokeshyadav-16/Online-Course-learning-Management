const db = require('../configuration/db');

// @desc    Get user profile details
// @route   GET /api/users/profile
const getUserProfile = async (req, res, next) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const [users] = await db.query(
            'SELECT user_id, name, email, role FROM users WHERE user_id = ?',
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: users[0] });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res, next) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        await db.query('UPDATE users SET name = ? WHERE user_id = ?', [name, userId]);
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get platform stats
// @route   GET /api/users/stats
const getPlatformStats = async (req, res, next) => {
    try {
        const [[{ total_courses }]] = await db.query('SELECT COUNT(*) AS total_courses FROM courses');
        const [[{ total_students }]] = await db.query("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'");
        const [[{ total_enrollments }]] = await db.query('SELECT COUNT(*) AS total_enrollments FROM enrollments');

        res.json({
            success: true,
            stats: {
                total_courses,
                total_students,
                total_enrollments
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getPlatformStats
};
