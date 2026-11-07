// Role-based access control middleware for route endpoints
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please sign in to access this resource.'
            });
        }

        const userRole = String(req.user.role).toLowerCase();
        const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase());

        if (!normalizedAllowed.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This action is restricted to [${allowedRoles.join(', ')}]. Your account role is "${req.user.role}".`
            });
        }

        next();
    };
};

module.exports = {
    requireRole
};
