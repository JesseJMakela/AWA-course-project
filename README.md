# Cloud Drive

A web-based document management system where users can create, edit and share text documents.

## What it does

- Register an account and log in securely
- Create, edit, rename and delete your own text documents
- Share documents with other registered users (view or edit permission)
- Generate a public link so anyone (without an account) can read a document
- Only one person can edit a document at a time — others see a warning
- Upload images to your personal drive and view or delete them
- Upload a profile avatar visible on your dashboard

## Installation

### Requirements

- Node.js v18 or higher
- MongoDB installed and running

### First time setup

Install dependencies for both backend and frontend:

```bash
cd backend && npm install && cd ../frontend && npm install && cd ..
```

### Running the app

```bash
./run.sh
```

This starts MongoDB, the backend (port 3001) and the frontend (port 5173) automatically.

To stop everything:

```bash
./stop.sh
```

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

### Upload images to your drive

1. Go to the **Images** tab on the dashboard
2. Click **Upload Image** and select a file (max 10 MB, images only)
3. Uploaded images are listed with their filename and a delete button

### Change your profile picture

1. On the dashboard, click the avatar area at the top
2. Select an image file (max 5 MB)
3. The new avatar is saved and shown immediately

### Troubleshooting

```bash
# MongoDB not running
sudo systemctl start mongodb

# Port already in use (backend)
sudo lsof -ti:3001 | xargs kill -9

# Port already in use (frontend)
sudo lsof -ti:5173 | xargs kill -9
```
