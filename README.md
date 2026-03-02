# Cloud Drive

A web-based document management system where users can create, edit and share text documents.

## What it does

- Register an account and log in securely
- Create, edit, rename and delete your own text documents
- Share documents with other registered users (view or edit permission)
- Generate a public link so anyone (without an account) can read a document
- Only one person can edit a document at a time — others see a warning

## Installation

### Requirements

- Node.js v18 or higher
- MongoDB installed and running

### 1. Start MongoDB

```bash
sudo systemctl start mongodb
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:3001`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

---

## How to use

### Register and log in

1. Go to `http://localhost:5173/register`
2. Enter a username (min 3 chars), email and password (min 6 chars)
3. After registering you are taken directly to the dashboard

### Create a document

1. Click **New Document** on the dashboard
2. Enter a title and click **Create**

### Edit a document

1. Click a document from the dashboard
2. Click **Edit** — the document is now locked for you
3. Type your changes (auto-saved every 10 seconds)
4. Click **Done Editing** when finished

### Share with another user

1. Open a document you own and click **Share**
2. Enter the other user's email and choose **View** or **Edit**
3. Click **Share** — the document now appears in their dashboard

### Create a public link

1. Open a document you own
2. Scroll to **Public Link** and click **Generate Public Link**
3. Copy the link and share it — anyone can read the document without an account

### Troubleshooting

```bash
# MongoDB not running
sudo systemctl start mongodb

# Port already in use (backend)
sudo lsof -ti:3001 | xargs kill -9

# Port already in use (frontend)
sudo lsof -ti:5173 | xargs kill -9
```
