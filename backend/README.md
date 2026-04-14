# Backend (NestJS + Prisma)

Setup:

1. cd backend
2. copy `.env.example` to `.env` and set secrets
3. npm install
4. npm run prisma:generate
5. npm run prisma:migrate
6. npm run start:dev

Dev defaults:
- Port: `4000`
- DB: SQLite `dev.db` (see `.env`)

Endpoints implemented (Auth):
- POST /admin/auth/sendotp  { mobile, deviceId? }
- POST /admin/auth/verifyotp { mobile, otp, deviceId }
- POST /admin/auth/resendotp { mobile }
- POST /auth/login { email, password, deviceId }
- GET /auth/refresh-token
- GET /auth/logout

Notes:
- This is a minimal scaffold. Add SMS provider, stronger rate-limiting, and hashed refresh comparison for production.
