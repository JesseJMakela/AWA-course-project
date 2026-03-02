import mongoose, { Document, Schema } from 'mongoose';

export interface IDriveImage extends Document {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DriveImageSchema: Schema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<IDriveImage>('DriveImage', DriveImageSchema);
