# Setup & Run Guide

## Backend Setup (Laravel)

### 1. Install Dependencies
```bash
cd backend
composer install
```

### 2. Environment Configuration
- `.env` file sudah ada (copy dari template)
- Update DB credentials jika perlu:
  ```
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_DATABASE=internhub_logbook
  DB_USERNAME=root
  DB_PASSWORD=
  ```

### 3. Generate App Key
```bash
php artisan key:generate
```

### 4. Run Database Migrations
```bash
php artisan migrate
```

### 5. Seed Test Data (Optional)
```bash
php artisan db:seed
```

**Test Accounts yang dibuat:**
| Email | Password | Role |
|-------|----------|------|
| `mentor@test.com` | `password123` | Dosen Pembimbing |
| `mahasiswa1@test.com` | `password123` | Mahasiswa 1 |
| `mahasiswa2@test.com` | `password123` | Mahasiswa 2 |

### 6. Start Laravel Server
```bash
php artisan serve
```
Server akan jalan di: **http://localhost:8000**

---

## Frontend Setup (React)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Configuration
- VITE_API_URL sudah ter-set di `.env` backend
- Frontend akan otomatis hit `http://localhost:8000/api`

### 3. Start Development Server
```bash
npm run dev
```
Frontend akan jalan di: **http://localhost:3000** (atau port lain yang available)

---

## Database Setup

### Create Database
```sql
CREATE DATABASE internhub_logbook;
```

### Run Migrations & Seeds
```bash
# Terminal di folder backend
php artisan migrate
php artisan db:seed --class=LogbookSeeder
```

---

## Quick Start (All-in-One)

### Terminal 1 - Backend
```bash
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Login Test Accounts

Setelah `php artisan db:seed`, gunakan credentials berikut untuk testing:

| Email | Password | Role |
|-------|----------|------|
| `mentor@test.com` | `password123` | Dosen Pembimbing |
| `mahasiswa1@test.com` | `password123` | Mahasiswa 1 (Budi Santoso) |
| `mahasiswa2@test.com` | `password123` | Mahasiswa 2 (Siti Nurhaliza) |

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:8000/api

---

## Testing API Endpoints

### Get All Logbooks (Intern)
```
GET http://localhost:8000/api/logbook
Headers: Authorization: Bearer <token>
```

### Create Logbook
```
POST http://localhost:8000/api/logbook
Headers: Authorization: Bearer <token>
Body: {
  "tanggal": "2026-05-10",
  "deskripsi_kegiatan": "Menyelesaikan fitur logbook",
  "bukti_kegiatan": []
}
```

### Mentor List Logbooks
```
GET http://localhost:8000/api/mentor/logbook
Headers: Authorization: Bearer <token>
```

### Verify Logbook (Mentor)
```
POST http://localhost:8000/api/mentor/logbook/{id}/verify
Headers: Authorization: Bearer <token>
Body: {
  "status": "verified",
  "feedback": "Good job!"
}
```

---

## Troubleshooting

### Issue: Database Connection Error
- Check MySQL is running
- Verify DB credentials di `.env`
- Ensure database `internhub_logbook` exists

### Issue: Port Already in Use
```bash
# Change Laravel port
php artisan serve --port=8001

# Change Vite port (automatic fallback)
npm run dev -- --port 3001
```

### Issue: CORS Error
- CORS sudah di-config di backend (`config/cors.php`)
- Frontend baseURL di axios sudah benar

### Issue: Migration Error
```bash
# Rollback dan coba lagi
php artisan migrate:rollback
php artisan migrate
```

---

## File Structure

```
tugas-ppl/
├── backend/
│   ├── app/Http/Controllers/Api/LogbookController.php
│   ├── app/Models/Logbook.php
│   ├── database/migrations/create_logbook_table.php
│   ├── database/seeders/LogbookSeeder.php
│   ├── routes/api.php
│   ├── composer.json
│   └── .env
├── frontend/
│   ├── src/pages/Magang/Logbook.jsx (Intern view)
│   ├── src/pages/Mentor/Logbook.jsx (Mentor approval)
│   ├── src/pages/Admin/Logbook.jsx (Admin monitoring)
│   ├── package.json
│   └── vite.config.js
└── docs/
    ├── proposal/outline.md
    └── testing/checklist.md
```

---

## Next Steps

1. ✅ Setup database & migrations
2. ✅ Install dependencies (composer + npm)
3. ✅ Seed test data
4. ✅ Run backend & frontend servers
5. ⏳ Test API endpoints dengan Postman
6. ⏳ Manual testing UI di frontend
7. ⏳ Write unit & integration tests
8. ⏳ UAT dengan stakeholder
