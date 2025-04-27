# Zone 25-14 - Backend API

This is the Node.js + Express backend for the Zone 25-14 project.

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- JWT (Authentication)
- Bcrypt (Password Encryption)
- CORS Middleware
- pg (PostgreSQL Driver)
- dotenv for environment variables

## Setup

1. Clone the repository.
2. Navigate into the backend folder:
   ```bash
   cd zone-25-14-backend
Install dependencies:
npm install

Create a .env file:
PORT=5000
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db_name
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

Start development server:
npm run dev

API Endpoints
/api/auth/register - Register User
/api/auth/login - Login User
/api/users/me - Fetch Current User
/api/products - Products Listing
(More coming soon: Orders, Cart, Wishlist, Friends)

Notes
Protected routes require Bearer JWT Token in Headers.

Admin-only routes protected with adminMiddleware.

Loyalty system (points → auto-leveling) is built in.

