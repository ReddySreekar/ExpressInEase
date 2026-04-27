# ExpressInEase

A secure, anonymous platform for expressing thoughts, confessions, ideas, and more. 

## Features
- **Anonymous Public Viewing**: Anyone can browse the feed of expressions categorized by topic.
- **Secure Authentication**: JWT-based login required to post, react, or report. Passwords hashed securely via `bcryptjs`.
- **Referral-Only Registration**: New accounts can only be created using a referral code from an existing user.
- **One Reaction Per User**: Engage with posts using a single emoji reaction. Clicking an existing reaction toggles it off.
- **Admin Dashboard**: Dedicated admin panel for managing reports, viewing posts (including author identities), tracking reactions, and reviewing the user referral tree.
- **Moderation**: Users can flag inappropriate content via a report system. Admins and post authors can delete content.
- **Custom Confirmations**: Clean, non-blocking custom modal confirmations for destructive actions.

## Technology Stack
- **Frontend**: React, Vite, vanilla CSS (vibrant glassmorphism design), Lucide React Icons.
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (`better-sqlite3`).

## Project Structure
The repository is split into distinct frontend and backend workspaces:
- `/frontend`: Contains the React UI application and Vite configuration.
- `/backend`: Contains the Node.js API, authentication middleware, and SQLite database.

## Getting Started

### Local Development
1. Install dependencies for the entire project from the root folder:
   ```bash
   npm run postinstall
   ```
   *(This automatically installs dependencies for both the `frontend` and `backend` directories)*

2. Start the development servers (runs Vite and Express concurrently):
   ```bash
   npm run dev
   ```
   - Frontend runs on: `http://localhost:5173`
   - Backend API runs on: `http://localhost:3001`

### Initial Admin Credentials
Upon the very first run, the database automatically seeds an initial admin account so you can access the dashboard and generate referrals:
- **Username**: `admin`
- **Password**: `admin123`
- **Referral Code**: `EXPRESSINEASE2026`

*Note: Be sure to change this password or delete the account in a production environment!*

## Deployment (Docker)

The application includes a multi-stage `Dockerfile` that builds the React frontend and statically serves it via the backend Express server on port 3000.

1. Build and run using Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

2. Access the application at `http://localhost:3000`.

The SQLite database is safely persisted across container restarts using a Docker volume (`sqlite-data` mapped to `/app/backend`).

