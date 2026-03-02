import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import documentRoutes from './src/routes/documents.js';
import userRoutes from './src/routes/users.js';
import fileRoutes from './src/routes/files.js';

// __dirname is not available in ES modules — derive it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clouddrive';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch((err) => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files as static assets
app.use('/static/images', express.static(path.join(__dirname, 'uploads/images')));
app.use('/static/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);

// Health check — reports MongoDB connection state
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${MONGODB_URI}\n`);
});

// Close MongoDB connection cleanly on CTRL+C
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
