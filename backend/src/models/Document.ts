import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  title: string;
  content: string;
  owner: mongoose.Types.ObjectId;
  isPublic: boolean;
  publicLink?: string;
  editPermissions: mongoose.Types.ObjectId[];
  viewPermissions: mongoose.Types.ObjectId[];
  currentlyEditingBy?: mongoose.Types.ObjectId | null;
  editLockExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  publicLink: {
    type: String,
    unique: true,
    sparse: true
  },
  editPermissions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  viewPermissions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  currentlyEditingBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  editLockExpiry: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
DocumentSchema.index({ owner: 1 });
DocumentSchema.index({ publicLink: 1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);
