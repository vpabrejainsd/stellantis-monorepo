# Stellantis Monorepo

This repository combines the **Stellantis Frontend** (Next.js + TypeScript + Prisma) and **Stellantis Backend** (Flask + Python) into a single monorepo managed by Docker Compose.

---

## Project Structure

```text
stellantis-monorepo/
├── docker-compose.yml       # Compose definition for frontend & backend
├── stellantis-frontend/     # Next.js app
    ├── .next
    ├── node_modules
    ├── prisma
    ├── public
    ├── src
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── .npmrc
    ├── bun.lock
    ├── components.json
    ├── Dockerfile
    ├── eslint.config.js
    ├── next-env.d.ts
    ├── next.config.js
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.js
    ├── prettier.config.js
    ├── README.md
    ├── sqlite3
    ├── start-database.sh
    ├── tailwind.config.ts
    ├── test.json
    └── tsconfig.json
└── stellantis-backend/      # Flask API
    ├── __pycache__
    ├── .env
    ├── core
    ├── data
    ├── database
    ├── models
    ├── utils
    ├── .gitignore
    ├── app.py
    ├── Dockerfile
    ├── generate_and_load.py
    ├── job_manager.py
    ├── main.py
    ├── README.md
    ├── recommender.py
    ├── requirements.txt
    └── setup.py

```

---

## 🛠 Prerequisites

- Docker (v20+)
- Docker Compose v2 (bundled with modern Docker)

---

## ⚙️ Environment Variables

Both services load their own .env files. Create and fill these before running.

- Frontend (stellantis-frontend/.env)
```text
# Example placeholders — please replace with your actual keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/sync-user
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/dashboard"

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=

NEXT_PUBLIC_FLASK_API_URL=http://localhost:4001
```

- Backend (stellantis-backend/.env)
```text
# Example placeholders
GEMINI_API_KEY=
MODEL_NAME=gemini-2.0-flash
# any other secrets or API keys
```

### note that stellantis-frontend has an .npmrc file with a mobiscroll api key.
---

## 🚀 Getting Started

### Clone the monorepo

```text
git clone https://github.com/vpabrejainsd/stellantis-monorepo.git
cd stellantis-monorepo
```

### Provision environment files

Copy stellantis-frontend/.env.example to stellantis-frontend/.env
Copy stellantis-backend/.env.example to stellantis-backend/.env

Fill in all required variables.

### Build and run with Docker Compose

```text
docker compose up --build
```

### Access the apps

Frontend: http://localhost:4000
Backend: http://localhost:4001

### Stop Services

```text
docker compose down
```

### 🐛 Troubleshooting

Port conflicts: Ensure nothing else is running on 4000 (frontend) or 4001 (backend).
Prisma errors: Verify that stellantis-frontend/prisma/schema.prisma exists and matches your database configuration.
NPM auth failures: Confirm that .npmrc is present in stellantis-frontend/ with a valid token and not listed in .dockerignore.

### 🤝 Contributing

closed for contributions lol