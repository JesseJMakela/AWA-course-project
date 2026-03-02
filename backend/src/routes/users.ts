import express, { Response } from 'express';
import User from '../models/User.js';
import { authenticateUser, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/search?q= — case-insensitive partial email search, max 10 results
router.get('/search', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await User.find({
      email: { $regex: q, $options: 'i' }
    })
    .select('-password')
    .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;
