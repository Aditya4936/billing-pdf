import mongoose, { Schema } from 'mongoose';
import { profileSchema } from './schemas.js';

const userSchema = new Schema(
  {
    name: { type: String, required: [true, 'Enter your name.'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Enter your email address.'],
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    // Never returned by default: only the login route asks for it (.select('+passwordHash')).
    passwordHash: { type: String, required: true, select: false },
    // The seller's main details. Absent until the first invoice is saved or the details are edited.
    profile: { type: profileSchema, default: undefined },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
