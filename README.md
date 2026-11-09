# Real Estate Portal — Full Stack Project

A full-stack property listing and management starter built with React + Vite, Express, PostgreSQL, and JWT authentication.

## Features
- Browse and search properties; filter by city, listing type, property type, and price
- Property detail view
- Register/login with bcrypt password hashing and JWT
- Create, edit, and delete your own listings
- Responsive layout and demo seed data
- PostgreSQL schema and seed script
- Owner-only CRUD authorization

## Requirements
- Node.js 20.19+ or 22.12+

## 1. Database setup
The development server starts a project-local PostgreSQL 17 instance automatically, creates the `real_estate_portal` database, and applies the schema and demo seed data. Database files persist in `server/.data/postgres`.

## 2. Configure backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
Leave `DATABASE_URL` empty in `.env` to use the embedded development database. Set it to your PostgreSQL connection string to use an external database instead. Replace the example JWT secret with a long random secret. API runs at `http://localhost:5001` by default. The frontend proxies `/api` requests to this local API; set `VITE_API_URL` in the client environment when using a separately hosted API.

For production, configure a managed PostgreSQL database with `DATABASE_URL` and start the API with `npm start`; the embedded database is only enabled by `npm run dev`.

## 3. Configure frontend
In a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL printed in the terminal, usually `http://localhost:5173`. `http://127.0.0.1:5173` is also supported.

## Demo notes
The seed script creates example properties only. Register an account to post and manage listings. Do not use demo credentials or a development JWT secret in production.

## API endpoints
- `GET /api/health`
- `GET /api/properties?search=&city=&listingType=&propertyType=&minPrice=&maxPrice=`
- `GET /api/properties/:id`
- `POST /api/properties` (auth required)
- `PUT /api/properties/:id` (owner only)
- `DELETE /api/properties/:id` (owner only)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (auth required)
- `GET /api/my/properties` (auth required)

## Important production upgrades
Before production, add rate limiting, email verification, password reset, image upload to Cloudinary/S3, request logging, stronger validation, automated tests, and a managed database. Configure CORS and HTTPS for your deployed domains.
