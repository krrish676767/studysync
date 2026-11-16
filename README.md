# StudySync

Student Course & Study Management System. DBMS mini project: **Next.js + MySQL + MongoDB**.

Students enroll in courses, submit assignments, log study sessions, plan tasks and keep notes.
Instructors create courses and assignments and grade submissions. Admins manage users and roles.

| Part | Technology | What lives there |
| --- | --- | --- |
| SQL database | MySQL 8.0+ | users, courses, enrollments, assignments, submissions, study sessions, materials, tasks, grade audit log |
| NoSQL database | MongoDB 7+ | notes (tags, embedded flashcards, text search) and the activity log |
| Frontend + API | Next.js 15 (App Router), React 19 | 11 pages, 27 API route files |
| Auth | bcryptjs + JWT (jose) in an httpOnly cookie | 3 roles: student, instructor, admin |

## 1. Prerequisites

- Node.js 20 or newer
- MySQL 8.0 or newer, running locally (`mysql --version`)
- MongoDB running locally on port 27017 (`mongosh --eval "db.version()"`)

On a Mac with Homebrew:

```bash
brew install mysql && brew services start mysql
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community
```

## 2. Setup (about two minutes)

Run everything from the project folder.

```bash
# 1. install packages
npm install

# 2. build the MySQL database: tables, data, procedures, triggers, roles
cat sql/01_schema.sql sql/02_seed.sql sql/03_advanced.sql sql/04_roles.sql | mysql -u root -p

# 3. build the MongoDB database: collections, validators, indexes, data
npm run db:mongo            # or:  mongosh mongo/01_setup.js

# 4. settings (the defaults already match the scripts above)
cp .env.example .env.local

# 5. check both databases are reachable with every role
npm run db:check

# 6. start
npm run dev
```

Open http://localhost:3000.

## 3. Demo accounts

The password of every demo account is `password123`.

| Role | E-mail | What to show |
| --- | --- | --- |
| Student | krrish@studysync.edu | dashboard, enroll, submit, sessions, task tree, notes, Query Lab |
| Instructor | alan@studysync.edu | create assignment, grade (trigger + audit log), roster, finalize grades |
| Admin | admin@studysync.edu | change roles, deactivate users, grade audit log, MongoDB activity analytics |

Other students: akshay@, ananya@, dev@, meera@, arjun@ (same domain). Second instructor: grace@studysync.edu.

## 4. Where each rubric item is

| Rubric item | Where |
| --- | --- |
| DDL with constraints | `sql/01_schema.sql` |
| DML | `sql/02_seed.sql`, DML block at the end of `sql/05_queries.sql`, every form in the app |
| Join, nested, correlated, recursive queries | `sql/05_queries.sql`, `lib/queryCatalog.js`, the Query Lab page |
| Procedures, functions, triggers, views | `sql/03_advanced.sql` |
| CTEs and window functions | queries C1 to C5, `app/api/tasks/route.js` |
| Role-based access control in the database | `sql/04_roles.sql`, `lib/db.js` |
| NoSQL creation | `mongo/01_setup.js`, `scripts/setup-mongo.mjs`, `lib/notes.js` |
| NoSQL CRUD and features | `mongo/02_crud_and_aggregation.js`, `app/api/notes/**`, `app/api/admin/activity/route.js` |
| Next.js interface | `app/(app)/**`, `app/login`, `app/register`, `components/` |
| Backend / API | `app/api/**`, `lib/` |
| Authentication and roles | `app/api/auth/**`, `lib/auth.js`, `lib/api.js`, `middleware.js` |

## 5. How role-based access works

1. Login checks the bcrypt hash and issues a JWT that carries the user's role.
2. `middleware.js` rejects any page or API request without a valid token and keeps `/admin` for admins.
3. Each API route calls `requireUser('instructor', 'admin')` or similar.
4. `lib/db.js` keeps **one MySQL connection pool per role**. A student's request runs as the MySQL user
   `ss_student`, which only has the privileges granted to `role_student` in `sql/04_roles.sql`.
   So even a bug in the API could not let a student change marks: MySQL itself refuses.

Try it in the terminal:

```bash
mysql -u ss_student -p'StudySync@Student1' studysync -e "SELECT password_hash FROM students"
# ERROR 1143 (42000): SELECT command denied to user 'ss_student'@'localhost' for column 'password_hash'
```

## 6. Useful commands

| Command | Purpose |
| --- | --- |
| `cat sql/01_schema.sql sql/02_seed.sql sql/03_advanced.sql sql/04_roles.sql | mysql -u root -p` | reset the MySQL data to the sample state |
| `npm run db:mongo` | reset the MongoDB data to the sample state |
| `mysql -u root -p --table < sql/05_queries.sql` | run all 30 queries and the DML / procedure demo in the terminal |
| `mongosh mongo/02_crud_and_aggregation.js` | run the MongoDB CRUD and aggregation demo |
| `npm run db:check` | test every database connection |
| `npm run db:queries` | regenerate `sql/05_queries.sql` from `lib/queryCatalog.js` |
| `npm run build && npm start` | production build |

## 7. Troubleshooting

- **`Access denied for user 'ss_student'`**: `sql/04_roles.sql` did not run. Run `sql/00_run_all.sql` as root again.
- **`Your password does not satisfy the current policy requirements`** while running `04_roles.sql`: your MySQL has a stricter
  password policy. Change the four passwords in `sql/04_roles.sql` and the same four in `.env.local`.
- **"Database is not reachable"** on the Notes page: MongoDB is not running (`brew services start mongodb-community`).
- **MySQL on another port or host**: edit `MYSQL_HOST` / `MYSQL_PORT` in `.env.local`.
- After an admin changes someone's role, that user has to sign out and in again to get a token with the new role.

## 8. Publishing to GitHub

```bash
git init
git add .
git commit -m "StudySync: Student Course and Study Management System (DBMS Mini Project)"
git branch -M main
git remote add origin https://github.com/krrish676767/StudySync.git
git push -u origin main
```

`.env.local` and `node_modules/` are already in `.gitignore`.

## 9. Contributors

- Krrish ([@krrish676767](https://github.com/krrish676767))
- A R Akshay Kumar ([@Akshayarcot](https://github.com/Akshayarcot))
