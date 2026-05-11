# TechKraft Recruitment Dashboard

An internal candidate scoring and review dashboard built for TechKraft's recruitment workflow. Reviewers can score candidates across categories and view AI-generated summaries. Admins have full visibility including internal notes and all reviewer scores.

---

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite, JWT
- **Frontend:** React, Vite, React Router, Axios
- **Infrastructure:** Docker, Docker Compose

---

## Project Structure

```
/
├── README.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── routers/
│   │   │   ├── candidates.py
│   │   │   └── auth.py
│   │   └── services/
│   │       └── candidate_service.py
│   └── tests/
│       └── test_api.py
└── frontend/
    ├── Dockerfile
    └── src/
        ├── App.jsx
        ├── api/
        │   └── client.js
        └── pages/
            ├── Login.jsx
            ├── CandidateList.jsx
            └── CandidateDetail.jsx
```

---

## Setup & Run

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/techkraft-recruitment.git
cd techkraft-recruitment
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values if needed
```

### 3. Start all services
```bash
docker compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs

### 4. Seed an admin user
After the containers are running, open a second terminal:

```bash
# Register admin account
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@test.com\",\"password\":\"secret\"}"

# Promote to admin role
docker exec -it techkraftreq-backend-1 python -c "
from app.database import SessionLocal
from app import models
db = SessionLocal()
user = db.query(models.User).filter(models.User.email == 'admin@test.com').first()
user.role = 'admin'
db.commit()
print('Done')
"

# Register a reviewer account
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"reviewer@test.com\",\"password\":\"secret\"}"
```

---

## Example API Calls

### Register
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"secret"}'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -d "username=admin@test.com&password=secret"
```

### List candidates with filters
```bash
curl "http://localhost:8000/candidates/?status=new&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get candidate detail
```bash
curl http://localhost:8000/candidates/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Submit a score
```bash
curl -X POST http://localhost:8000/candidates/1/scores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"Technical Skills","score":4,"note":"Strong React knowledge"}'
```

### Generate AI summary (2s mock delay)
```bash
curl -X POST http://localhost:8000/candidates/1/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Soft delete a candidate (admin only)
```bash
curl -X DELETE http://localhost:8000/candidates/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Role-Based Access Control

| Feature | Reviewer | Admin |
|---|---|---|
| View candidate list | Y | Y |
| View candidate detail | Y | Y |
| Submit scores | Y | Y |
| View own scores only | Y | — |
| View all reviewer scores | N | Y |
| View internal notes | N | Y |
| Edit internal notes | N | Y |
| Delete (soft) candidates | N | Y |

**Security note:** Registration always hardcodes role to `reviewer`. Role is never accepted from the client request body.

---

## Debugging Bug — Identified & Fixed

### The buggy code
```python
def search_candidates(status, keyword, page, page_size):
    all_candidates = db.execute("SELECT * FROM candidates").fetchall()
    filtered = [c for c in all_candidates if c["status"] == status]
    offset = (page - 1) * page_size
    return filtered[offset : offset + page_size]
```

### What is wrong
This loads the **entire candidates table into Python memory** before filtering. There are three concrete problems:

1. **Memory exhaustion at scale** — with 100,000 candidates, every request allocates a full table scan into RAM regardless of how many results are needed.
2. **Broken pagination** — the offset/limit is applied to the already-filtered Python list, not the full dataset. Page 2 of filtered results will skip rows incorrectly because the total count is unknown before filtering.
3. **No database indexes used** — pushing filtering into Python bypasses any indexes on `status` or `role_applied`, making every query a full table scan at the DB level too.

### The correct approach
Push all filtering, pagination, and counting into SQL using the database engine:

```python
def search_candidates(status, keyword, page, page_size):
    offset = (page - 1) * page_size
    q = db.query(Candidate).filter(Candidate.deleted_at == None)
    if status:
        q = q.filter(Candidate.status == status)       # uses DB index
    if keyword:
        q = q.filter(Candidate.name.ilike(f"%{keyword}%"))
    total = q.count()                                   # accurate total
    results = q.offset(offset).limit(page_size).all()  # DB-level pagination
    return {"total": total, "items": results}
```

This uses database indexes, never loads unused rows into memory, and produces correct pagination totals.

---

## Architecture Decision Records (ADR)

### ADR 1 — FastAPI over Flask or Django

**Context:** The assignment required an async mock LLM endpoint with a 2-second simulated delay, plus auto-generated API documentation for the evaluator to explore.

**Decision:** Chose FastAPI with `async/await` for the summary endpoint.

**Trade-off:** FastAPI has a smaller ecosystem than Django. No built-in admin panel. Accepted this because async support and automatic OpenAPI docs at `/docs` directly serve the assignment's requirements, and Django's ORM and admin are unnecessary overhead for a focused internal tool.

---

### ADR 2 — SQLite over DynamoDB or PostgreSQL

**Context:** The assignment mentioned "DynamoDB-style or SQLite" and the goal was a working local dev environment with zero cloud dependencies.

**Decision:** SQLite via SQLAlchemy ORM with indexes on `status`, `role_applied`, and `candidate_id`.

**Trade-off:** SQLite does not support concurrent writes at scale and is not production-ready for multi-instance deployments. This is acceptable for a local recruitment tool. Swapping to PostgreSQL requires only changing `DATABASE_URL` in `.env` — the SQLAlchemy ORM layer abstracts the difference entirely.

---

### ADR 3 — JWT Bearer Tokens over Sessions

**Context:** The frontend is a React SPA consuming a stateless REST API. Server-side sessions would require shared session storage across instances.

**Decision:** JWT tokens stored in `localStorage`, sent as `Authorization: Bearer` headers on every request.

**Trade-off:** JWTs cannot be revoked server-side before expiry. A compromised token remains valid until it expires. Accepted for this use case given the short expiry window (60 minutes) and internal-tool threat model. A production system would add a token denylist in Redis.

---

## Soft Delete

Candidates are never hard-deleted. The `DELETE /candidates/{id}` endpoint sets `deleted_at = datetime.utcnow()` on the record. All list and detail queries filter `WHERE deleted_at IS NULL`. This preserves audit history and prevents accidental data loss.

---

## Running Tests

```bash
docker exec -it techkraftreq-backend-1 pytest tests/ -v
```

Tests cover:
- `test_health` — API health check returns 200
- `test_register_and_login` — full auth flow works
- `test_unauthenticated_blocked` — protected routes return 401 without a token

---

## Learning Reflection

This project was my first time implementing role-based field filtering at the serializer level — hiding `internal_notes` from reviewers by checking the user's role inside the `serialize()` function rather than at the query level. It works cleanly but has a limitation: a sufficiently complex frontend bug could still expose the field name in network responses even if the value is null. Given more time, I would explore enforcing this at the database layer using PostgreSQL Row-Level Security policies, which would make it impossible for the application layer to accidentally leak admin-only fields regardless of how the serializer is written.

---

## Known Limitations

- SQLite does not support concurrent writes — swap `DATABASE_URL` to PostgreSQL for production
- JWT tokens cannot be revoked before expiry — a Redis-based denylist would fix this
- The AI summary endpoint is a mock (2s sleep) — a real implementation would call an LLM API and stream the response via SSE
- No email verification on registration
- Frontend has no refresh token logic — users are logged out after 60 minutes

---

## Environment Variables

See `.env.example` for all required variables. Never commit `.env` with real values.

```env
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./techkraft.db
```
