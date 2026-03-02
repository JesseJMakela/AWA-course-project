import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extends Express Request with the decoded JWT payload
export interface AuthRequest extends Request {
  user?: {
    _id: string;
    username: string;
    email: string;
  };
}

// Blocks the request if no valid Bearer token is present
export const authenticateUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.SECRET;

    if (!secret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, secret) as {
      _id: string;
      username: string;
      email: string;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Same as authenticateUser but never rejects — used for routes accessible by both
// authenticated users and anonymous visitors (e.g. public document view)
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = process.env.SECRET;

      if (secret) {
        const decoded = jwt.verify(token, secret) as {
          _id: string;
          username: string;
          email: string;
        };
        req.user = decoded;
      }
    }
    next();
  } catch {
    // Invalid token is silently ignored; anonymous access continues
    next();
  }
};
