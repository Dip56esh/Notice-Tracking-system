# Digital Notice & Letter Tracking System

### Stack: React (Vite) · Django REST Framework 

---

## Project structure

```
NEA_dclts_prj/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   └── dclts/
│       ├── settings.py
│       ├── urls.py
│       ├── wsgi.py
│       ├── users/
│       │   ├── models.py         
│       │   ├── serializers.py
│       │   ├── views.py          
│       │   ├── urls.py
│       │   ├── admin.py
│       │   └── management/commands/seed.py
│       ├── organizations/
│       │   ├── models.py         
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── admin.py
│       └── notices/
│           ├── models.py         
│           ├── serializers.py
│           ├── views.py          
│           ├── urls.py
│           └── admin.py
└── frontend/
    ├── package.json
    ├── vite.config.js            
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── utils/api.js          
        ├── hooks/useAuth.jsx     
        ├── components/
        │   ├── Layout.jsx        
        │   ├── NoticeTable.jsx   
        │   └── NoticeDetail.jsx  
        └── pages/
            ├── LoginPage.jsx
            ├── Dashboard.jsx
            ├── ComposePage.jsx       
            ├── OutboxPage.jsx
            ├── InboxPage.jsx
            ├── OrganizationsPage.jsx
            └── UsersPage.jsx
```

---

## Setup

### 1. Backend — Django + SQLite

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (creates db.sqlite3 automatically)
python manage.py makemigrations users organizations notices
python manage.py migrate

# Seed default admin user
python manage.py seed

# Start Django dev server
python manage.py runserver      # → http://localhost:8000
```

### 2. Frontend — React + Vite

```bash
cd frontend
npm install
npm run dev                     # → http://localhost:5173
```

---

## Default login

```
Email:    admin@dclts.gov.np
Password: admin123
```

> Change the password after first login via Django admin at http://localhost:8000/admin

---

## API endpoints

| Method | Path                                | Description                           |
| ------ | ----------------------------------- | ------------------------------------- |
| POST   | /api/auth/login/                    | Login → returns JWT token             |
| POST   | /api/auth/register/                 | Register new user                     |
| GET    | /api/auth/me/                       | Current user info                     |
| GET    | /api/auth/users/                    | List all users (admin/manager)        |
| PATCH  | /api/auth/users/:id/role/           | Update user role                      |
| GET    | /api/organizations/                 | List all orgs with departments        |
| POST   | /api/organizations/                 | Create organization                   |
| POST   | /api/organizations/:id/departments/ | Add department                        |
| DELETE | /api/organizations/:id/             | Delete organization                   |
| GET    | /api/notices/                       | List notices (filterable + paginated) |
| POST   | /api/notices/                       | Create notice (status = DRAFT)        |
| GET    | /api/notices/stats/                 | Dashboard stats by status             |
| GET    | /api/notices/:id/                   | Single notice + full timeline         |
| PATCH  | /api/notices/:id/status/            | Advance notice status                 |
| GET    | /api/notices/:id/timeline/          | Timeline events only                  |
| GET    | /api/token/refresh/                 | Refresh JWT token                     |

---


## Django admin

Full admin panel available at `http://localhost:8000/admin` with:

- Users management
- Organizations + departments (inline)
- Notices with inline timeline events
- Reference counter table
