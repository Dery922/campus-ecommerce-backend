import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  deviceName: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  studentID : {type : Number, required:true, unique:true},
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["buyer", "seller", "admin"], required: true },
  emailVerified: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
  avatarUrl: { type: String },
  phoneNumber: { type: String },
  lastLoginAt: { type: Date },
  refreshTokens: [refreshTokenSchema]
}, { timestamps: true });

export default mongoose.model("User", userSchema);
