# LibraryHub

A library management system built as the Week 2 task for the DawoodTech Full Stack internship.

- **Live app:** https://libraryhub-client-theta.vercel.app/
- **API:** https://libraryhub-two.vercel.app
- **Repo:** https://github.com/Adan694/libraryhub

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Librarian | librarian@libraryhub.dev | password123 |
| Member | member@libraryhub.dev | password123 |


## Screenshots


### Desktop view

![Desktop view](client/screenshots/desktop.png)

### Mobile view

![Mobile view](client/screenshots/mobile.png)

## Database schema

See [ERD.md](ERD.md) for the full entity-relationship diagram.

```mermaid
erDiagram
    USER ||--o{ BORROW : makes
    USER ||--o{ RESERVATION : places
    BOOK ||--o{ BORROW : "borrowed via"
    BOOK ||--o{ RESERVATION : "reserved via"

    USER {
        string id PK
        string email UK
        string name
        Role role
    }
    BOOK {
        string id PK
        string title
        string author
        string isbn UK
        string category
        int totalCopies
        int availableCopies
    }
    BORROW {
        string id PK
        string userId FK
        string bookId FK
        datetime dueAt
        datetime returnedAt
        float fine
        BorrowStatus status
    }
    RESERVATION {
        string id PK
        string userId FK
        string bookId FK
        ReservationStatus status
        int position
    }
The four tables and their relationships are shown above. Reservations are
modelled in the schema but the API and UI aren't built yet — the queue
position column is there so it can be added later without a migration.
## What it does

Librarians can add and remove books and see a dashboard with totals, overdue loans, fines collected, and the most-borrowed titles. Members can search the catalogue, borrow books, and return them. Late returns get a fine automatically.

Everything that touches the `availableCopies` count runs inside a `prisma.$transaction`, so two people borrowing the last copy at the same time can't both succeed.

## Stack

- TypeScript
- Node + Express
- PostgreSQL on Neon
- Prisma ORM (schema, migrations, seed)
- Zod for request validation
- JWT in httpOnly cookies plus a bearer token fallback for cross-domain requests
- bcrypt for password hashing
- Vanilla JS frontend (no build step)


Validation: Zod. Schemas live in `server/src/schemas/` and are duplicated in
`client/index.html` (loaded from CDN) because the frontend has no build step.
Both sides enforce the same rules; the shapes are kept in sync manually.
## Running it locally

You'll need Node 18+ and a Postgres database. Neon's free tier works fine, or run one locally with Docker.

```bash
git clone https://github.com/Adan694/libraryhub
cd libraryhub/server
npm install
```

Copy `server/.env.example` to `server/.env` and fill in your own values:

```
DATABASE_URL="postgresql://neondb_owner:npg_Ag8E6fmiThNZ@ep-hidden-unit-b5wbw7yt-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="2t8iTkGl0ZzYqdavCmF63N1cJrWDXLyHKeoAbSEMnRxfwUgup4jPhV9Q5O7IsB"
PORT=4000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

Then set up the database and start the server:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The API runs at `http://localhost:4000`. Open `client/index.html` directly in a browser (or serve it with the VS Code Live Server extension) and update the `API` constant near the top of the script tag to `http://localhost:4000`.

## API

All request bodies are validated with Zod. Auth uses `Authorization: Bearer <token>` or the `token` cookie.

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/register` | Anyone |
| POST | `/api/auth/login` | Anyone |
| POST | `/api/auth/logout` | Anyone |
| GET | `/api/auth/me` | Signed in |
| GET | `/api/books` | Anyone |
| GET | `/api/books/:id` | Anyone |
| POST | `/api/books` | Librarian |
| PATCH | `/api/books/:id` | Librarian |
| DELETE | `/api/books/:id` | Librarian |
| POST | `/api/borrows` | Member |
| POST | `/api/borrows/:id/return` | Member |
| GET | `/api/borrows/me` | Signed in |
| GET | `/api/borrows` | Librarian |
| GET | `/api/dashboard` | Librarian |

`GET /api/books` accepts `q` (searches title and author), `category`, `page`, and `limit`.

## Data model

Four tables, defined in `server/prisma/schema.prisma`.

**User** — email (unique), password hash, name, role (LIBRARIAN or MEMBER).

**Book** — title, author, ISBN (unique), category, totalCopies, availableCopies.

**Borrow** — links a user to a book with borrowedAt, dueAt, returnedAt, fine, and status (ACTIVE, RETURNED, OVERDUE).

## Borrow flow

`POST /api/borrows` runs inside a transaction:

1. Read the book inside the transaction.
2. If `availableCopies` is zero, abort with 409.
3. Decrement `availableCopies`.
4. Create the Borrow record with a due date.
5. Commit. If anything throws, the decrement rolls back too.

Returning reverses it and computes the fine as `daysLate * 10`.

## What's not built

ISBN lookup via Open Library, and email reminders were listed as bonus. 

## Deploying

The backend and frontend are two separate Vercel projects pointed at the same repo.

Backend: root directory `server`, env vars `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_URL` set to the frontend URL.

Frontend: root directory `client`, no build command, no env vars. The API URL is hardcoded near the top of the script tag in `client/index.html`.

## Notes

Written by Amna Shahzad for the Week 2 task at DawoodTech. If something's broken or unclear, open an issue on the repo.