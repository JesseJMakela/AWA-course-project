# Project Documentation

## Implemented Features

| Feature             | Description                                                                                                   | Points target |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ------------- |
| User registration   | New users can register with username, email and password                                                      | Mandatory     |
| User login / logout | JWT-based authentication, secure logout                                                                       | Mandatory     |
| Create document     | Authenticated users can create text documents                                                                 | Mandatory     |
| Delete document     | Owners can delete their documents                                                                             | Mandatory     |
| Rename document     | Document title can be renamed in the editor                                                                   | Mandatory     |
| Edit document       | Full text editing with auto-save every 10 seconds                                                             | Mandatory     |
| Edit permission     | Owner can grant edit access to other registered users                                                         | Mandatory     |
| View permission     | Owner can grant view-only access to other registered users                                                    | Mandatory     |
| Public link         | Owner can generate a public link for anonymous read-only access                                               | Mandatory     |
| Edit locking        | Only one user can edit a document at a time; others see a warning                                             | Mandatory     |
| Session recovery    | If a user closes the tab while editing, they can reclaim the lock                                             | Mandatory     |
| Responsive UI       | Works on mobile, tablet and desktop using Tailwind CSS                                                        | Mandatory     |
| Input validation    | Server-side validation on all inputs (express-validator)                                                      | Quality       |
| Password hashing    | Passwords hashed with bcrypt (10 rounds)                                                                      | Quality       |
| File upload         | Users can upload image files to their personal drive (images only; stored server-side with multer, max 10 MB) | Optional +2   |
| Profile picture     | Users can upload, change and remove a profile photo stored on the server; shown in the dashboard header       | Optional +2   |

## Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: express-validator

### Frontend

- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP client**: Axios
- **Build tool**: Vite

## Project Structure

```
Project/
├── backend/          # Node.js + Express API (port 3001)
│   ├── server.ts
│   ├── uploads/
│   │   ├── images/   # Uploaded drive images
│   │   └── avatars/  # User profile pictures
│   └── src/
│       ├── models/       # Mongoose schemas (User, Document, DriveImage)
│       ├── routes/       # API route handlers (auth, documents, users, files)
│       ├── middleware/   # JWT auth middleware
│       └── validators/   # Input validation rules
└── frontend/         # React frontend (port 5173)
    └── src/
        ├── pages/        # Login, Register, Dashboard, Editor, PublicDocument
        ├── context/      # AuthContext (global auth state + refreshUser)
        ├── components/   # ProtectedRoute
        └── api/          # Axios client (authAPI, documentAPI, fileAPI, userAPI)
```

---

## AI Declaration

GitHub Copilot (powered by Claude) was used during the development of this project.

**Where and how it was used:**

- Generating boilerplate code for Express routes, Mongoose models and React components
- Suggesting TypeScript types and interfaces
- Reviewing and fixing logic for the edit-lock mechanism
- Writing and structuring this documentation

All generated code was reviewed, understood and adapted by the developer before inclusion in the project.
