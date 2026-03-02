import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateUser, AuthRequest } from '../middleware/auth.js';
import DriveImage from '../models/DriveImage.js';
import User from '../models/User.js';

const router = express.Router();

// --- Multer config for drive images ---
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve('uploads/images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// --- Multer config for avatars ---
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve('uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /api/files/images - Upload image to drive
router.post('/images', authenticateUser, imageUpload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const driveImage = new DriveImage({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      owner: req.user!._id
    });

    await driveImage.save();

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        _id: driveImage._id,
        filename: driveImage.filename,
        originalName: driveImage.originalName,
        url: `/static/images/${driveImage.filename}`,
        size: driveImage.size,
        createdAt: driveImage.createdAt
      }
    });
  } catch (error: unknown) {
    console.error('Image upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    res.status(500).json({ error: message });
  }
});

// GET /api/files/images - List user's drive images
router.get('/images', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const images = await DriveImage.find({ owner: req.user!._id }).sort({ createdAt: -1 });
    res.json({
      images: images.map(img => ({
        _id: img._id,
        filename: img.filename,
        originalName: img.originalName,
        url: `/static/images/${img.filename}`,
        size: img.size,
        createdAt: img.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// DELETE /api/files/images/:id - Delete a drive image
router.delete('/images/:id', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const image = await DriveImage.findOne({ _id: req.params.id, owner: req.user!._id });
    if (!image) return res.status(404).json({ error: 'Image not found' });

    const filePath = path.resolve('uploads/images', image.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await image.deleteOne();

    res.json({ message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// POST /api/files/avatar - Upload / update profile picture
router.post('/avatar', authenticateUser, avatarUpload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old avatar file if it exists
    if (user.avatar) {
      const oldPath = path.resolve('uploads/avatars', path.basename(user.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.avatar = `/static/avatars/${req.file.filename}`;
    await user.save();

    res.json({ message: 'Avatar updated', avatar: user.avatar });
  } catch (error: unknown) {
    console.error('Avatar upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload avatar';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/files/avatar - Remove profile picture
router.delete('/avatar', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.avatar) {
      const oldPath = path.resolve('uploads/avatars', path.basename(user.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      user.avatar = undefined;
      await user.save();
    }

    res.json({ message: 'Avatar removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

export default router;
