import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name is too short"],
      maxlength: [60, "Name is too long"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9_.]{3,24}$/,
        "Username must be 3-24 characters: letters, numbers, dot or underscore",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },
    password: { type: String, select: false },
    avatar: { type: String, default: null },
    avatarPublicId: { type: String, default: null, select: false },
    bio: { type: String, default: "", maxlength: 240 },
    statusMessage: { type: String, default: "", maxlength: 80 },
    location: { type: String, default: "", maxlength: 60 },
    website: { type: String, default: "", maxlength: 120 },

    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    suspendedReason: { type: String, default: "" },

    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, default: null, index: true, sparse: true },

    otpHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpSentAt: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },

    lastSeen: { type: Date, default: Date.now },

    privacy: {
      showLastSeen: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
    },
    notifications: {
      sound: { type: Boolean, default: true },
      desktop: { type: Boolean, default: true },
      preview: { type: Boolean, default: true },
      groups: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

userSchema.index({ name: "text", username: "text" });
userSchema.index({ createdAt: -1 });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model("User", userSchema);
