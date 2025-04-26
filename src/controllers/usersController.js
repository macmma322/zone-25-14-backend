const pool = require('../config/db');

const getMe = async (req, res) => {
    try {
      const query = `
        SELECT 
          u.user_id, 
          u.username, 
          u.first_name, 
          u.last_name, 
          u.biography, 
          u.profile_picture, 
          u.store_credit, 
          u.created_at, 
          rl.role_name
        FROM users u
        JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
        WHERE u.user_id = $1
      `;
  
      const { rows } = await pool.query(query, [req.user.userId]);
      const user = rows[0];
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ user });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  };
module.exports = {
  getMe,
};
