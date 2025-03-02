const pool = require("../config/db");

const userController = {
  async updateUserRole(req, res) {
    const { userId, newRole } = req.body;

    if (req.user.roleId !== 1) {
      // Assuming '1' is Owner (Kami no Tou)
      return res
        .status(403)
        .json({ error: "You do not have permission to modify roles." });
    }

    try {
      const updatedUser = await pool.query(
        "UPDATE users SET role_id = (SELECT role_id FROM user_roles WHERE role_name = $1) WHERE user_id = $2 RETURNING *",
        [newRole, userId]
      );

      res
        .status(200)
        .json({ message: "User role updated.", user: updatedUser.rows[0] });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role." });
    }
  },
};

module.exports = userController;
