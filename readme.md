# TripMate

Smart Travel Itinerary Planner & Tour Booking Platform

---

# 1. PROJECT TECHNOLOGY

## Frontend

- ReactJS
- Vite
- React Router
- Axios
- Bootstrap

## Backend

- Node.js
- Express.js
- RESTful API

## Database

- MongoDB Atlas
- Mongoose

## Authentication

- JWT
- bcrypt

IMPORTANT:

Do NOT add any new technology, framework, library, UI library, CSS framework, database, authentication system, or npm package unless explicitly requested.

Do NOT introduce technologies such as:
- Tailwind CSS
- Material UI
- Ant Design
- Redux
- Firebase
- Supabase
- Prisma
- Sequelize
- MySQL
- PostgreSQL
- Next.js
- Vue
- Angular

Use the existing technology stack.

---

# 2. AI CODING RULES

The existing codebase is the SOURCE OF TRUTH.

Before coding:

1. Read the relevant existing files.
2. Check the existing project structure.
3. Check package.json.
4. Check existing components.
5. Check existing pages.
6. Check existing routes.
7. Check existing services/API code.
8. Check existing models when working on backend.
9. Reuse existing code whenever possible.

Do NOT assume the project structure.

Do NOT create a new architecture if an existing architecture already exists.

Do NOT create duplicate components, services, utilities, models, routes, or API logic.

---

# 3. MINIMAL CHANGE RULE

Implement the SMALLEST change necessary to complete the user's request.

Do NOT:

- Rewrite unrelated code.
- Modify unrelated files.
- Refactor code that is not related to the task.
- Rename files without a reason.
- Create unnecessary files.
- Create unnecessary folders.
- Create unnecessary abstractions.
- Install unnecessary packages.
- Change the existing architecture without permission.

If one file is enough, do not modify multiple files.

---

# 4. NO UNREQUESTED FEATURES

ONLY implement what the user explicitly requests.

Do NOT automatically implement future features.

For example, if the user asks for a Home Page UI:

Do NOT implement:
- Login
- Register
- Authentication
- JWT
- bcrypt
- Backend
- REST API
- MongoDB
- Mongoose
- AI
- Booking
- Payment

If the user asks for Login UI:

Do NOT automatically implement:
- Login API
- JWT
- Database authentication
- Registration
- Forgot Password

Wait for the user to request those features.

---

# 5. NO RANDOM OR FAKE DATA

Do NOT invent project data.

Never create fake:

- Users
- Tours
- Destinations
- Bookings
- Reviews
- Prices
- Locations
- Statistics
- API responses
- Database records

unless the user explicitly requests mock/demo data.

If real data/API is not available yet, create the UI without fake business data or use a clean empty state.

Do not put fake database-like data inside React components.

Every application data value must have a clear source:

1. User input
2. Backend API
3. Database
4. Explicitly provided static configuration
5. Explicitly requested mock data

---

# 6. FRONTEND / BACKEND / DATABASE RULES

## Frontend

Use:

- ReactJS
- Vite
- React Router
- Axios
- Bootstrap

Use Bootstrap for UI and responsive layout.

Do not add another UI framework or CSS framework.

Reuse existing components and styles.

Axios should only be used when API communication is required.

Do not create fake API calls.

---

## Backend

Use:

- Node.js
- Express.js
- RESTful API

Before creating an API:

1. Check existing routes.
2. Check existing controllers.
3. Check existing services.
4. Check existing models.
5. Check existing middleware.

Reuse the existing architecture.

Do not create duplicate endpoints.

---

## Database

Use:

- MongoDB Atlas
- Mongoose

Before creating a new model:

1. Check existing models.
2. Check whether the entity already exists.
3. Reuse existing models when possible.

Only create fields that are actually required.

Do NOT invent fields for future use.

---

## Authentication

Use:

- JWT
- bcrypt

Passwords must never be stored as plain text.

Do not introduce another authentication system.

Do not implement authentication unless the current task requires it.

---

# 7. CODE QUALITY

Code must be:

- Clean
- Simple
- Readable
- Consistent
- Beginner-friendly
- Reusable when appropriate

Avoid over-engineering.

Do NOT add:

- Unnecessary design patterns
- Complex state management
- Unnecessary custom hooks
- Unnecessary utilities
- Excessive abstraction
- Duplicate logic

Use the simplest solution that satisfies the requirement.

Follow the existing naming convention.

If no convention exists:

React components:
```text
PascalCase

Functions and variables:

camelCase

Remove before finishing:

Unused imports
Unused variables
Duplicate code
Dead code
Temporary console.log()
Debug code
Unnecessary comments
Unnecessary dependencies

# 8. FINAL CHECK

Before finishing every coding task:

Check compilation errors.
Check React errors.
Check imports.
Check naming consistency.
Check existing functionality.
Check responsive UI when applicable.
Check API consistency when applicable.
Check database consistency when applicable.
Remove unused code.
Remove debug code.
Remove unnecessary files.
Make sure no unnecessary dependency was added.
Make sure no random/fake data was introduced.
Make sure no unrequested feature was implemented.

Final response should briefly contain:

Implemented:
- ...

Files created:
- ...

Files modified:
- ...

Not implemented:
- ...

Notes:
- ...