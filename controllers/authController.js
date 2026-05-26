import bcrypt from "bcrypt";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import Student from "../models/Student.js";
import { uploadAvatarToCloud } from "../utils/uploadService.js";
import PasswordReset from "../models/PasswordReset.js";
import { sendOtpEmail } from "./GeneralController.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Look up user document
    //const user = await User.findOne({ email: email.toLowerCase() });
    // ✅ THE FIX: Force Mongoose to select the hidden encrypted password string from MongoDB
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify system account status toggles
    if (user.status !== "active") {
      return res
        .status(403)
        .json({
          message: `Access denied. Your account is currently ${user.status}.`,
        });
    }

    // CONDITIONAL CHECK: Block unapproved hostel owners (sellers)
    if (user.role === "seller" && !user.isApproved) {
      return res.status(403).json({
        message:
          "Your merchant registration is currently pending platform approval.",
      });
    }

    // Check password hash match
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Optional: Log tracking details
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return the clean profile object containing authorization values
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
        // ✅ ADD THESE
        activeListingsCount: user.activeListingsCount || 0,
        isPremiumStudent: user.isPremiumStudent || false,
      },
      token,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    // req.user.id is automatically populated by your authenticateJWT middleware guard
    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "Session profile no longer exists." });
    }
    res.status(200).json({ user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to verify session profile status." });
  }
};

export const register = async (req, res) => {
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const {
      fullName,
      email,
      studentID,
      phoneNumber,
      password,
      role, // 👈 Expect "buyer" (student) or "seller" (hostel owner) from frontend
    } = req.body;

    // Enforce dynamic role fallback if frontend doesn't specify one
    const targetRole = role || "buyer";

    // 1️⃣ Global check for existing email (Applies to all roles)
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 2️⃣ CONDITIONAL LOGIC: If the registrant is a student (buyer)
    if (targetRole === "buyer") {
      if (!studentID) {
        return res
          .status(400)
          .json({ message: "Student ID is required for student registration" });
      }

      // Check if student exists in school verification database
      const studentRecord = await Student.findOne({ studentId: studentID });
      if (!studentRecord) {
        return res
          .status(400)
          .json({
            message: "Invalid student ID. Not found in university records.",
          });
      }

      // Prevent reusable registrations
      if (studentRecord.registered) {
        return res
          .status(400)
          .json({
            message: "This Student ID is already linked to an account.",
          });
      }

      // Mark the school verification record as claimed
      studentRecord.registered = true;
      await studentRecord.save();
    }

    // 3️⃣ Global password hashing logic
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // 4️⃣ Create the new user matching your refined sparse schema
    const user = await User.create({
      name: fullName,
      email: email.toLowerCase(),
      // Use studentID only if role is buyer; store undefined/null for hostel owners
      studentID: targetRole === "buyer" ? studentID : undefined,
      password: hashed,
      phoneNumber,
      role: targetRole,
      avatar,
      // Note: isApproved handles itself dynamically via your schema default property setup
    });

    // 5️⃣ Generate security token
    const token = generateToken(user._id);

    // Contextual client-side response message strings
    const registrationMessage =
      targetRole === "seller"
        ? "Merchant application submitted. Awaiting platform owner review."
        : "Registration successful!";

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
        // ✅ ADD THESE
        activeListingsCount: user.activeListingsCount || 0,
        isPremiumStudent: user.isPremiumStudent || false,
      },
      token,
    });

    // res.status(201).json({
    //   message: registrationMessage,
    //   user: {
    //     _id: user._id,
    //     name: user.name,
    //     email: user.email,
    //     role: user.role,
    //     isApproved: user.isApproved,
    //     isPremiumStudent: user.isPremiumStudent || false,
    //   },
    //   token: targetRole === "buyer" ? token : undefined // Hide token if seller is unapproved
    // });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res
      .status(500)
      .json({ message: "Server error during registration workflow" });
  }
};
export const updateUser = async (req, res) => {};


//this controller logic is for password reset in the security section
export const passwordReset = async (req, res) => {
  const { email, password } = req.body;

  const record = otpStore.get(email);

  if (!record || !record.verified) {
    return res.status(403).json({ message: "OTP not verified" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.updateOne({ email }, { password: hashedPassword });

  otpStore.delete(email);

  res.json({ message: "Password reset successful" });
};


export const updateProfileAvatar = async (req, res) => {
  try {
    // req.file is populated here via your in-memory multer middleware gateway hook
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Upload Failed: No image file payload detected." });
    }

    // 🚀 Stream to your configured Cloudinary instance
    const secureCloudUrl = await uploadAvatarToCloud(req.file);

    // Update the authenticated user's document parameters inside MongoDB
    // req.user.id is populated securely by your JWT authentication route middleware gate
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: secureCloudUrl },
      { new: true }, // Returns the newly updated user document object immediately
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "User profile record not found." });
    }

    // Return the absolute Cloud link directly back to your React/Expo mobile client app
    res.status(200).json({
      message: "Profile image synchronized with cloud successfully.",
      avatar: updatedUser.avatar, // 👈 Your side drawer reads this exact field on line 53!
    });
  } catch (error) {
    console.error("AVATAR UPLOAD CONTROLLER ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to upload image asset.", error: error.message });
  }
};



/*  
* This part of the code is for forgotten password logic
*
*/


export const sendForgotPasswordOtp = async (req, res) =>{
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: "Email parameter is required." });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Verify user profile exists in core DB records
    const userExists = await User.findOne({ email: cleanEmail });
    
    // Security Best Practice: Don't confirm non-existent emails to attackers.
    if (!userExists) {
      res.status(200).json({ success: true, message: "If that email exists, an OTP has been sent." });
      return;
    }

    // 2. Generate a secure crypto 6-Digit random code number string
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Define token lifespan window (e.g., valid for 10 minutes)
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Save the reset data payload token row into database
    await PasswordReset.create({
      email: cleanEmail,
      otp: generatedOtp,
      expiresAt: expiryTime
    });

    // 5. Send Email dispatch trigger
    // TODO: Connect NodeMailer, SendGrid or AWS SES here to mail the generatedOtp out
   const emailResult = await sendOtpEmail(email, generatedOtp);
     if (!emailResult.success) {
       console.error('Failed to send email:', emailResult.error);
       return res.status(500).json({ 
         message: "Failed to send OTP email. Please try again later." 
       });
     }
     
    res.status(200).json({ success: true, message: "Verification security code sent to your email." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server handling error." });
  }
}

export const resetForgotPassword = async (req, res) => {
    try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ success: false, message: "Missing required parameters." });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Fetch active reset records matching email and code values
    const resetRecord = await PasswordReset.findOne({
      email: cleanEmail,
      otp: otp.trim(),
      isUsed: false
    });

    // 2. Enforce token validation check (Wrong code configuration)
    if (!resetRecord) {
      res.status(400).json({ success: false, message: "Invalid or expired verification code." });
      return;
    }

    // 3. Enforce validation check (Code time lifespan expired)
    if (new Date() > resetRecord.expiresAt) {
      res.status(400).json({ success: false, message: "Verification code has expired." });
      return;
    }

    // 4. Locate core user file
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      res.status(404).json({ success: false, message: "User account association not found." });
      return;
    }

    // 5. Hash the password before database submission
    const saltRounds = 12;
    const encryptedHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 6. Persist changes to the Core database
    user.password = encryptedHashedPassword;
    await user.save();

    // 7. Consume token state permanently
    resetRecord.isUsed = true;
    await resetRecord.save();

    res.status(200).json({ success: true, message: "Password reset successful!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reset password." });
  }
}