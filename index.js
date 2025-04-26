require('dotenv').config({ path: './src/.env' });
const express = require("express");
const pool = require('./src/config/db.js');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Import your routes here
const authRoutes = require('./src/routes/authRoutes.js');
app.use('/api/auth', authRoutes);

const usersRoutes = require('./src/routes/usersRoutes');
app.use('/api/users', usersRoutes);

const productRoutes = require('./src/routes/productRoutes');
app.use('/api/products', productRoutes);


const pointsRoutes = require('./src/routes/pointsRoutes');
app.use('/api/points', pointsRoutes);

const orderRoutes = require('./src/routes/orderRoutes');
app.use('/api/orders', orderRoutes);

// Database Connection Test
pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL Database');
    client.release(); // Important! Release connection back to pool.

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Failed to connect to PostgreSQL Database:', err.message);
    process.exit(1); // Exit the server if DB is not connected
  });
