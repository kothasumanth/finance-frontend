# Finance Copilot React Frontend

This is the frontend for the Finance Copilot project, built with React and Vite. It provides a modern, user-friendly interface to view user data from the backend API.

## Features
- Modern React (Vite) setup
- Fetches user data from the backend API
- Displays users in a clean, responsive table
- Tracks account-specific daily expenses with multi-entry forms, optional comments, editable/deletable entries, daily entry views, monthly totals, and year/month expense-type analysis

## Getting Started

### 1. Install dependencies
```sh
npm install
```

### 2. Start the development server
```sh
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173) by default.

### 3. Connect to the backend
Make sure the Finance Copilot backend (Node.js + Express + MongoDB) is running and accessible. During local development, the frontend defaults to `http://localhost:3000`.

The frontend uses `/api` for backend calls. Vite proxies this path to `http://localhost:3000` during local development; Netlify proxies it to the deployed Render backend using `public/_redirects`. The local proxy stays pointed at localhost and does not use the production API. If the production backend URL changes, update the Netlify redirect and deploy again.

### Develop Locally and Deploy Safely

1. Keep both repositories on a feature branch (for example, `Lakshmi`) while making changes.
2. In the backend repository, use the local `.env` with `MONGODB_URI=mongodb://localhost:27017/finance_copilot`, then run `npm start`.
3. In the frontend repository, run `npm run dev`. The app at `http://localhost:5173` sends `/api` requests to the local backend at `http://localhost:3000`.
4. Test both applications locally. The local backend must be restarted after changing backend code so Node loads the updated routes.
5. Commit and push only the feature branch, then open a pull request into `main` when the changes are ready. Configure Render and Netlify to use `main` as their production branch; merging the pull request is the production release.

Local `.env` files are ignored by Git. Keep production secrets and the production MongoDB URI only in Render's environment settings, never in committed files.

The Finance Overview shows **Manage Users** only to Admin accounts. Admins can assign Admin/Member roles and delete users; the backend enforces the same permissions independently of the UI.

## Database Backup & Restore
Backup and restore functionality is managed from the **backend**. See [backend README](../finance-backend/README.md#backup--restore) for details.

Quick commands:
```powershell
# From finance-backend folder
npm run backup    # Create database backup
npm run restore   # Restore from backup
```

## Deploy as a Local Web App (Recommended for Local Use)

You can run the Finance Copilot app as a local web app, so you don't have to manually start the frontend and backend every time. This is useful for persistent access on your machine.

### 1. Build the Frontend
```sh
npm run build
```

### 2. Serve the Frontend
Install a static server if you don't have one:
```sh
npm install -g serve
```
Serve the build folder:
```sh
serve -s dist -l 5173
```
The frontend will be available at [http://localhost:5173](http://localhost:5173).

### 3. Run Backend as a Background Process
Install pm2 globally if you don't have it:
```sh
npm install -g pm2
```
Start the backend (from the backend folder):
```sh
pm2 start index.js --name finance-backend
pm2 save
```
This keeps your backend running in the background.

### 4. (Optional) Start on Boot
For pm2, run:
```sh
pm2 startup
```

Now you can access your app anytime at [http://localhost:5173](http://localhost:5173) without manually running both servers each time.

## Next Steps
- Implement the user table UI in `src/App.jsx` to fetch and display users from the backend.
- Customize styles in `src/App.css` as needed.

## Project Structure
- `src/` - React source code
- `public/` - Static assets

---

For more details, see the backend project README.
