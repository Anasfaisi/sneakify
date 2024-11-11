// middleware/auth.js
exports.isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Please login to access this resource'
        });
    }
    next();
};

exports.isAdmin = (req, res, next) => {
    if (req.session.userRole !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied: Admin only resource'
        });
    }
    next();
};