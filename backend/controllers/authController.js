const db = require('../configuration/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Email validation helper
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

// @desc    Register a new user (Student or Instructor)
// @route   POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        // 1. Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields (name, email, password) are required.'
            });
        }

        // 2. Validate name format
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Full name must be at least 2 characters long.'
            });
        }

        // 3. Validate email format
        const normalizedEmail = email.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // 4. Validate password strength (minimum 6 characters)
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // 5. Sanitize and validate role
        const validRoles = ['student', 'instructor'];
        const userRole = (role && validRoles.includes(role.toLowerCase())) ? role.toLowerCase() : 'student';

        // 6. Check for duplicate email registration
        const [existing] = await db.query(
            'SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)',
            [normalizedEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This email is already registered. Please log in or use a different email.'
            });
        }

        // 7. Securely hash password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 8. Store user in database
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [trimmedName, normalizedEmail, hashedPassword, userRole]
        );

        const newUserId = result.insertId;

        // 9. Generate secure JWT token
        const token = jwt.sign(
            {
                user_id: newUserId,
                name: trimmedName,
                email: normalizedEmail,
                role: userRole
            },
            process.env.JWT_SECRET || 'lms_secret_key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // 10. Respond with success & sanitized user object (NO password)
        res.status(201).json({
            success: true,
            message: `Account created successfully as ${userRole === 'instructor' ? 'Instructor' : 'Student'}!`,
            token,
            user: {
                user_id: newUserId,
                name: trimmedName,
                email: normalizedEmail,
                role: userRole
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Validate inputs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Query user by email
        const [users] = await db.query(
            'SELECT user_id, name, email, password, role FROM users WHERE LOWER(email) = LOWER(?)',
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password. Please verify your credentials.'
            });
        }

        const user = users[0];

        // 3. Compare provided password against stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password. Please verify your credentials.'
            });
        }

        // 4. Generate secure JWT token
        const token = jwt.sign(
            {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET || 'lms_secret_key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // 5. Respond with sanitized user (never return hashed password)
        res.json({
            success: true,
            message: 'Signed in successfully!',
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
const getCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const [users] = await db.query(
            'SELECT user_id, name, email, role FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getCurrentUser
};
