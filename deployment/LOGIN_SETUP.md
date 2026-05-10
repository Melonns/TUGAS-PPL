# 🔐 Login & Authentication Setup

## Changes Made

### Backend (Laravel)
1. **AuthController.php** - New authentication controller
   - `POST /api/login` - Public endpoint for login
   - `POST /api/logout` - Revoke current token
   - `GET /api/me` - Get current user info

2. **routes/api.php** - Updated routes
   - Added public login endpoint
   - Added auth endpoints (logout, me)
   - All logbook routes protected with `auth:sanctum`

### Frontend (React)
1. **src/pages/Login.jsx** - New login page
   - Email/password form
   - Error handling
   - Test credentials display
   - Auto-redirect to logbook after login

2. **src/components/ProtectedRoute.jsx** - Route protection
   - Check for token in localStorage
   - Redirect to login if not authenticated

3. **src/components/Navbar.jsx** - Navigation bar
   - User info display
   - Logout button
   - Responsive design

4. **src/api/axiosConfig.js** - Updated axios config
   - Add Bearer token to all requests
   - Auto-redirect to login on 401

5. **src/App.jsx** - Updated routing
   - Changed from HashRouter to BrowserRouter
   - `/login` - Public login page
   - `/logbook` - Mahasiswa logbook (protected)
   - `/mentor/logbook` - Mentor approval (protected)
   - `/admin/logbook` - Admin monitoring (protected)
   - `/` redirects to `/login`

---

## 🚀 How It Works

### Login Flow
1. User opens app → redirected to `/login`
2. Enter email & password
3. Frontend calls `POST /api/login`
4. Backend validates & returns token + user info
5. Frontend stores token in localStorage
6. Frontend redirects to `/logbook`
7. All subsequent requests include Bearer token

### Protected Routes
- ProtectedRoute component checks for token
- If no token → redirect to `/login`
- If 401 error → clear token & redirect to `/login`

### Logout Flow
1. Click logout button
2. Frontend calls `POST /api/logout`
3. Backend revokes token
4. Frontend clears localStorage
5. Redirect to `/login`

---

## 📝 Test Credentials

```
Mentor/Dosen:
Email: mentor@test.com
Password: password123

Mahasiswa 1:
Email: mahasiswa1@test.com
Password: password123

Mahasiswa 2:
Email: mahasiswa2@test.com
Password: password123
```

---

## 🔄 Updated Setup Steps

### Backend
```bash
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### Public (No Auth)
```
POST /api/login          - Login with email & password
```

### Protected (Auth Required)
```
POST /api/logout         - Logout & revoke token
GET /api/me             - Get current user info

GET /api/logbook         - List user's logbooks
POST /api/logbook        - Create logbook
GET /api/logbook/{id}    - Get logbook detail
PUT /api/logbook/{id}    - Update logbook
DELETE /api/logbook/{id} - Delete logbook

GET /api/mentor/logbook  - List intern logbooks (mentor only)
POST /api/mentor/logbook/{id}/verify - Approve/reject

GET /api/admin/logbook   - Monitor all logbooks (admin only)
```

---

## ✅ What's Ready

- [x] Login page with email/password form
- [x] Bearer token authentication (Sanctum)
- [x] Protected routes with token check
- [x] Auto-logout on 401
- [x] Navbar with user info & logout button
- [x] Test credentials
- [x] AuthController endpoints
- [x] API routes updated

---

## 🎯 Workflow

```
Login Page
    ↓
Enter credentials
    ↓
POST /api/login
    ↓
Token + User Info
    ↓
Store in localStorage
    ↓
Redirect to /logbook
    ↓
Navbar + Logbook Page
    ↓
All requests include Bearer token
    ↓
Click Logout
    ↓
POST /api/logout
    ↓
Clear localStorage
    ↓
Redirect to /login
```

---

**Status:** ✅ Ready to test!
