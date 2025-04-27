// index.js
require('dotenv').config({ path: './src/.env' });

const express = require("express");
const pool = require('./src/config/db.js');
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ▪️ Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// ▪️ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ▪️ Import Routes
const authRoutes = require('./src/routes/authRoutes.js');
const usersRoutes = require('./src/routes/usersRoutes.js');
const productRoutes = require('./src/routes/productRoutes.js');
const pointsRoutes = require('./src/routes/pointsRoutes.js');
const orderRoutes = require('./src/routes/orderRoutes.js');

// ▪️ Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', productRoutes); // 🛠️ IMPORTANT: Mount productRoutes under '/api', NOT '/api/products'

// ▪️ Root Endpoint (Optional: simple welcome message)
app.get('/', (req, res) => {
  res.send('🔥 Welcome to Zone 25-14 API');
});

// ▪️ Database Connection Test + Server Start
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

