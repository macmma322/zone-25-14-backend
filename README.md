# 🛡️ Zone 25-14 Backend

This is the main backend server for **Zone 25-14** —  
the platform built around loyalty, rebellion, brotherhood, and unstoppable ambition.

The backend handles **authentication, user management, product control, order processing, loyalty leveling, and admin operations**.

---

## 🧠 About the Backend

Zone 25-14 is a hybrid between e-commerce, social networking, and loyalty-driven movement.  
The backend forms the **command center** where all data, authentication, permissions, and business logic happens.

This backend is designed for:

- Full user registration and authentication
- Secure JWT login with OAuth2 extension planned
- Encrypted data protection
- Products and variations management
- Orders and Cart systems
- Loyalty Points + Auto Level-Up engine
- Role-based Permission System (Explorer, Supporter, Founder, etc.)
- Admin capabilities for promotions, control, and moderation

---

## 🛠️ Technologies Used

| Stack | Description |
|:------|:------------|
| Node.js (v18+) | Core server |
| Express.js | Routing and API layer |
| PostgreSQL | Database (managed with `pg` and `pg-pool`) |
| JWT (jsonwebtoken) | Secure authentication |
| Bcryptjs | Password hashing |
| Axios | Internal and external API calls (future) |
| CORS | Cross-origin security |
| Helmet | Security headers |
| Express-Rate-Limit | Brute-force protection |
| Dotenv | Environment variables |
| Nodemon | Local development auto-restart |

---

## 📋 Project Structure

```bash
zone-25-14-backend/
├── src/
│   ├── config/         # Database, JWT config
│   ├── controllers/    # Main API business logic
│   ├── middleware/     # Auth, Role protection
│   ├── models/         # SQL queries and logic
│   ├── routes/         # Express routes (auth, users, products, etc.)
│   ├── services/       # Helper functions (email, loyalty, etc.)
│   ├── utils/          # Utility functions
├── .env                # Environment variables
├── server.js           # Main server file
├── package.json        # Dependencies

---

## 🔐 Authentication Flow

1.Register → New user created → Password hashed with bcrypt.
2.Login → JWT Token issued → Saved in frontend.
3.Protected Routes → Token attached automatically with Axios interceptors.
4.Role-Based Access → Middleware checks if user is Admin, Moderator, or Founder for protected routes.

---

## 🛡️ Security Features

-Passwords hashed (bcrypt with 12 rounds).
-JWT secret and expiry handled through .env.
-CORS policy enabled.
-Helmet security headers.
-Rate Limiting on login/register routes.

---

## 📦 How to Run Locally

1.Clone the repository:
    -git clone https://github.com/YOUR-USERNAME/zone-25-14-backend.git

2.Install dependencies:
    -npm install

3.Create a .env file:
    PORT=5000
    DB_USER=postgres
    DB_PASSWORD=yourpassword
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=the_zone_core
    JWT_SECRET=yourstrongsecret
    JWT_EXPIRES_IN=7d

4.Start server in dev mode:
    -npm run dev

---

## 🛠️ Current APIs Implemented

    Endpoint                    | Description
    POST /api/auth/register     | Register new user
    POST /api/auth/login        | Login and issue token
    GET /api/users/me           | Fetch current user profile
    POST /api/products          | Create new product (Admin only)
    GET /api/products           | Fetch all products
    POST /api/orders            | Create new order + earn points (Connected to Level-Up System)

---

## 🔥 Future Planned APIs

    -Wishlist API
    -Friends System API
    -Messaging System API
    -Admin Dashboard APIs
    -Gift Card System
    -Loyalty Badges System
    -Public Wishlists & Gifting

---

## 🛡️ Mission Philosophy

Zone 25-14 Backend is designed with these principles:

    -Security First: No user data is left exposed.
    -Performance Driven: Minimal, clean, fast server operations.
    -Extensible: New systems (friends, donations, giveaways) can be added easily.
    -Scalable: Built to handle growth — users, products, live events.

---