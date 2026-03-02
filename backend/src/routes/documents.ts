// Document CRUD, locking, sharing, and public-link routes.
//
// Locking: POST /:id/lock grants a 10-minute exclusive edit lock.
// The lock expires automatically, so closing a tab never permanently blocks
// other users. POST /:id/unlock releases it early.
import express, { Response } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { authenticateUser, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { documentValidation, validate } from '../validators/validation.js';

// Shape of a populated user sub-document returned by Mongoose .populate()
interface PopulatedUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
}

const router = express.Router();

// GET /api/documents - Get all documents for authenticated user
router.get('/', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    // Find documents where user is owner, has edit permission, or has view permission
    const documents = await Document.find({
      $or: [
        { owner: userId },
        { editPermissions: userId },
        { viewPermissions: userId }
      ]
    })
    .populate('owner', 'username email')
    .populate('editPermissions', 'username email')
    .populate('viewPermissions', 'username email')
    .populate('currentlyEditingBy', 'username email')
    .sort({ updatedAt: -1 });

    // Add permission info for each document
    const documentsWithPermissions = documents.map(doc => {
      const docObj = doc.toObject();
      const owner = doc.owner as unknown as PopulatedUser;
      const editPerms = doc.editPermissions as unknown as PopulatedUser[];
      return {
        ...docObj,
        isOwner: owner._id.toString() === userId,
        canEdit: owner._id.toString() === userId || 
                 editPerms.some(u => u._id.toString() === userId),
        canView: true
      };
    });

    res.json({ documents: documentsWithPermissions });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Create a new document
router.post('/', authenticateUser, documentValidation, validate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content = '' } = req.body;
    const userId = req.user!._id;

    const newDocument = new Document({
      title,
      content,
      owner: userId
    });

    await newDocument.save();
    await newDocument.populate('owner', 'username email');

    res.status(201).json({
      message: 'Document created successfully',
      document: {
        ...newDocument.toObject(),
        isOwner: true,
        canEdit: true,
        canView: true
      }
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// GET /api/documents/:id - Get a specific document
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const document = await Document.findById(id)
      .populate('owner', 'username email')
      .populate('editPermissions', 'username email')
      .populate('viewPermissions', 'username email')
      .populate('currentlyEditingBy', 'username email');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    const owner = document.owner as unknown as PopulatedUser;
    const isOwner = userId && owner._id.toString() === userId;
    const editPerms = document.editPermissions as unknown as PopulatedUser[];
    const viewPerms = document.viewPermissions as unknown as PopulatedUser[];
    const hasEditPermission = userId && editPerms.some(u => u._id.toString() === userId);
    const hasViewPermission = userId && viewPerms.some(u => u._id.toString() === userId);

    // Allow access if: owner, has permissions, or document is public
    if (!isOwner && !hasEditPermission && !hasViewPermission && !document.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      document: {
        ...document.toObject(),
        isOwner,
        canEdit: isOwner || hasEditPermission,
        canView: true
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// PUT /api/documents/:id - Update a document
router.put('/:id', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user!._id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check edit permission
    const isOwner = document.owner.toString() === userId;
    const hasEditPermission = document.editPermissions.some((oid: Types.ObjectId) => 
      oid.toString() === userId
    );

    if (!isOwner && !hasEditPermission) {
      return res.status(403).json({ error: 'No edit permission' });
    }

    // Check if document is being edited by someone else
    if (document.currentlyEditingBy && 
        document.editLockExpiry && 
        document.editLockExpiry > new Date() &&
        document.currentlyEditingBy.toString() !== userId) {
      const editor = await User.findById(document.currentlyEditingBy);
      return res.status(423).json({ 
        error: 'Document is currently being edited',
        editedBy: editor?.username 
      });
    }

    // Update document
    if (title !== undefined) document.title = title;
    if (content !== undefined) document.content = content;

    await document.save();
    await document.populate('owner', 'username email');
    await document.populate('editPermissions', 'username email');
    await document.populate('viewPermissions', 'username email');

    res.json({
      message: 'Document updated successfully',
      document: {
        ...document.toObject(),
        isOwner,
        canEdit: true,
        canView: true
      }
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id - Delete a document
router.delete('/:id', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner can delete
    if (document.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only owner can delete document' });
    }

    await Document.findByIdAndDelete(id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/:id/lock - Lock document for editing
router.post('/:id/lock', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check edit permission
    const isOwner = document.owner.toString() === userId;
    const hasEditPermission = document.editPermissions.some((oid: Types.ObjectId) => 
      oid.toString() === userId
    );

    if (!isOwner && !hasEditPermission) {
      return res.status(403).json({ error: 'No edit permission' });
    }

    // Check if locked by someone else
    if (document.currentlyEditingBy && 
        document.editLockExpiry && 
        document.editLockExpiry > new Date() &&
        document.currentlyEditingBy.toString() !== userId) {
      const editor = await User.findById(document.currentlyEditingBy);
      return res.status(423).json({ 
        error: 'Document is currently being edited',
        editedBy: editor?.username 
      });
    }

    // Lock document for 10 minutes
    document.currentlyEditingBy = new Types.ObjectId(userId);
    document.editLockExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await document.save();

    res.json({ 
      message: 'Document locked for editing',
      lockExpiry: document.editLockExpiry 
    });
  } catch (error) {
    console.error('Lock document error:', error);
    res.status(500).json({ error: 'Failed to lock document' });
  }
});

// POST /api/documents/:id/unlock - Unlock document
router.post('/:id/unlock', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only the user who locked it can unlock
    if (document.currentlyEditingBy?.toString() !== userId) {
      return res.status(403).json({ error: 'You did not lock this document' });
    }

    document.currentlyEditingBy = null;
    document.editLockExpiry = null;
    await document.save();

    res.json({ message: 'Document unlocked' });
  } catch (error) {
    console.error('Unlock document error:', error);
    res.status(500).json({ error: 'Failed to unlock document' });
  }
});

// POST /api/documents/:id/share - Share document with users
router.post('/:id/share', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { emails, permission } = req.body; // permission: 'edit' or 'view'
    const userId = req.user!._id;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    if (!['edit', 'view'].includes(permission)) {
      return res.status(400).json({ error: 'Permission must be "edit" or "view"' });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner can share
    if (document.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only owner can share document' });
    }

    // Find users by emails
    const users = await User.find({ email: { $in: emails } });

    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found with provided emails' });
    }

    const userIds = users.map(u => u._id);

    // Add permissions
    if (permission === 'edit') {
      document.editPermissions = [...new Set([...document.editPermissions.map(id => id.toString()), ...userIds.map(id => id.toString())])].map(id => new Types.ObjectId(id));
    } else {
      document.viewPermissions = [...new Set([...document.viewPermissions.map(id => id.toString()), ...userIds.map(id => id.toString())])].map(id => new Types.ObjectId(id));
    }

    await document.save();
    await document.populate('editPermissions', 'username email');
    await document.populate('viewPermissions', 'username email');

    res.json({
      message: 'Document shared successfully',
      document: document.toObject()
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ error: 'Failed to share document' });
  }
});

// DELETE /api/documents/:id/share/:userId - Remove user permission
router.delete('/:id/share/:userId', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user!._id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner can remove permissions
    if (document.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only owner can modify permissions' });
    }

    // Remove from both edit and view permissions
    document.editPermissions = document.editPermissions.filter((oid: Types.ObjectId) => 
      oid.toString() !== targetUserId
    );
    document.viewPermissions = document.viewPermissions.filter((oid: Types.ObjectId) => 
      oid.toString() !== targetUserId
    );

    await document.save();
    await document.populate('editPermissions', 'username email');
    await document.populate('viewPermissions', 'username email');

    res.json({
      message: 'Permission removed successfully',
      document: document.toObject()
    });
  } catch (error) {
    console.error('Remove permission error:', error);
    res.status(500).json({ error: 'Failed to remove permission' });
  }
});

// POST /api/documents/:id/public - Generate public link
router.post('/:id/public', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner can make document public
    if (document.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only owner can make document public' });
    }

    document.isPublic = true;
    document.publicLink = crypto.randomBytes(16).toString('hex');
    await document.save();

    res.json({
      message: 'Public link generated',
      publicLink: document.publicLink
    });
  } catch (error) {
    console.error('Generate public link error:', error);
    res.status(500).json({ error: 'Failed to generate public link' });
  }
});

// DELETE /api/documents/:id/public - Remove public access
router.delete('/:id/public', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner can remove public access
    if (document.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only owner can modify public access' });
    }

    document.isPublic = false;
    document.publicLink = undefined;
    await document.save();

    res.json({ message: 'Public access removed' });
  } catch (error) {
    console.error('Remove public access error:', error);
    res.status(500).json({ error: 'Failed to remove public access' });
  }
});

// GET /api/documents/public/:link - View document by public link
router.get('/public/:link', async (req, res: Response) => {
  try {
    const { link } = req.params;

    const document = await Document.findOne({ publicLink: link, isPublic: true })
      .populate('owner', 'username email');

    if (!document) {
      return res.status(404).json({ error: 'Document not found or not public' });
    }

    res.json({
      document: {
        _id: document._id,
        title: document.title,
        content: document.content,
        owner: document.owner,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        isOwner: false,
        canEdit: false,
        canView: true
      }
    });
  } catch (error) {
    console.error('Get public document error:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

export default router;
