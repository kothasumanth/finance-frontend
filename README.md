# Finance Copilot React Frontend

This is the frontend for the Finance Copilot project, built with React and Vite. It provides a modern, user-friendly interface to view user data from the backend API.

## Features
- Modern React (Vite) setup
- Fetches user data from the backend API
- Displays users in a clean, responsive table

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
Make sure the Finance Copilot backend (Node.js + Express + MongoDB) is running and accessible. By default, the frontend expects the backend API to be available at `http://localhost:3000`.

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
