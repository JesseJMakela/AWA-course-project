import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string; // stored as bcrypt hash
  username: string;
  avatar?: string;  // relative URL to uploaded profile picture
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: undefined
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
