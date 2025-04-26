const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const adminProtect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                userId: decoded.userId,
            };

            const query = `
        SELECT rl.role_name
        FROM users u
        JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
        WHERE u.user_id = $1
      `;
            const { rows } = await pool.query(query, [req.user.userId]);
            const userRole = rows[0]?.role_name;

            if (["Store Chief", "Hype Lead", "Founder"].includes(userRole)) {
                next();
            } else {
                return res.status(403).json({ message: 'Access denied. Admins only.' });
            }
        } catch (error) {
            console.error('Admin Auth Error:', error.message);
            return res.status(401).json({ message: 'Not authorized' });
        }
    } else {
        return res.status(401).json({ message: 'No token provided' });
    }
};

module.exports = {
    adminProtect,
};
