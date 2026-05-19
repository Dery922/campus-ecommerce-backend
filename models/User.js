import mongoose from "mongoose";
import bcrypt from "bcrypt";

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  deviceName: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  
  // CHANGED: Removed unique:true and required:true to prevent database collision errors for Admins/Sellers
studentID: { 
  type: String, 
  required: false, // 👈 Changed from true to false
  sparse: true,    // 👈 ADD THIS: Tells MongoDB to ignore null/missing duplicates!
  default: undefined
},
  
  password: { type: String, required: true },
  
  // KEEP: buyer = Student App User, seller = Hostel Owner, admin = You
  role: { type: String, enum: ["buyer", "seller", "admin"], required: true },
  
  // ADDED: Crucial for your admin-vetting onboarding process
  isApproved: {
    type: Boolean,
    default: function() {
      // Admins and App Buyers are instantly active; Hostel Sellers must wait for your approval
      return this.role !== "seller"; 
    }
  },
  
  emailVerified: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
  avatar: { type: String },
  phoneNumber: { type: String },
  lastLoginAt: { type: Date },
  refreshTokens: [refreshTokenSchema]
}, { timestamps: true });

// Optional: Document validation pre-save hook to force studentID ONLY if the role is a buyer


userSchema.pre("save", function () {
  if (this.role === "buyer" && !this.studentID) {
    throw new Error(
      "Validation Failed: studentID is strictly required for student (buyer) accounts."
    );
  }
});
export default mongoose.model("User", userSchema);
