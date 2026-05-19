import express from "express"
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { generateOtp } from "../utils/generateOtp.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Report from "../models/Report.js";
import nodemailer from 'nodemailer';

const otpStore = new Map();



export const changeProfileImage = async (req, res) => {
  console.log("UPLOAD RESPONSE:", );
  try {
    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatarUrl },
      { new: true }
    );

    res.json({ avatarUrl });
  } catch (error) {
    res.status(500).json({ message: "Upload failed" });
  }
};
export const generateOtpCode = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = generateOtp();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false,
    });
    console.log(`OTP for ${email}: ${otp}`);

    return res.json({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
};

export const verifyOtpEnd = async (req, res) => {
  const { email, otp } = req.body;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const record = otpStore.get(normalizedEmail);
  if (!record) {
    return res.status(400).json({ message: "OTP Not Found" });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ message: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Mark email as verified (temporary token/session)
  otpStore.set(normalizedEmail, { ...record, verified: true });

  res.json({ message: "OTP verified successfully" });
};





// Create transporter with correct Gmail settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // This MUST be the App Password
  },
  // Add these for better compatibility
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration (useful for debugging)
export const verifyTransporter = () => {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Transporter verification failed:', error);
    } else {
      console.log('SMTP transporter is ready to send emails');
    }
  });
};

export const sendOtpEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00BFFF;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the OTP below:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold;">
            ${otp}
          </div>
          <p>This OTP will expire in <strong>5 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `,
      text: `Your password reset OTP is: ${otp}\nValid for 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

export const forgotPassword = async (req,res) => {
  const email = String(req.body.email || "") .trim().toLowerCase();
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email:email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const otp = generateOtp();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false,
    });
    console.log(`OTP for ${email}: ${otp}`);
    const emailResult = await sendOtpEmail(email, otp);
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return res.status(500).json({ 
        message: "Failed to send OTP email. Please try again later." 
      });
    }
    return res.status(200).json({ message: "OTP sent successfully" });
  }
  catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const otpRecord = otpStore.get(email);
    if (!otpRecord || !otpRecord.verified) {
      return res.status(403).json({ message: "OTP not verified" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    otpStore.delete(email);
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: error.message });
  }
};





export const reportIssue = async (req, res) => {
  try {
    const { description, category, targetId, targetType } = req.body;

    if (!description || !category || !targetId || !targetType) {
      return res.status(400).json({
        message: "description, category, targetId, and targetType are required",
      });
    }

    const uploadedImages = (req.files || []).map(
      (file) => file.path || file.secure_url || file.filename,
    );

    const report = await Report.create({
      description,
      category,
      images: uploadedImages,
      reporter: req.user._id,
      targetId,
      targetType,
    });

    res.status(201).json(report);
  } catch (error) {
    if (error?.code === 11000) {
      const reportedTargetType = req.body?.targetType || "item";
      return res.status(409).json({
        message: `You have already reported this ${reportedTargetType}`,
      });
    }

    res.status(500).json({ message: error.message || "Failed to submit report" });
  }
}
export const attachmentImages = async (req, res) => {
  console.log("=== IMAGE UPLOAD ===");
  console.log("File:", req.file);
  console.log("Conversation ID:", req.body.conversationId);
  
  try {
    const { conversationId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    // Create image URL
    const imageUrl = `/uploads/chat-images/${req.file.filename}`;
    
    // Create message matching your schema
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: "📷 Image",
      messageType: "image",
      images: [imageUrl],
      isRead: false
    });
    
    console.log("Message created:", message._id);
    
    // Populate sender info
    await message.populate('sender', 'name email profileImage');
    
    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: "📷 Image",
      updatedAt: new Date()
    });
    
    // Emit socket event - MOVED HERE AFTER MESSAGE CREATION
    const io = req.app.get("io") || global.io;
    if (io) {
      io.to(conversationId).emit('receiveMessage', message);
      console.log("Socket emitted to room:", conversationId);
    }
    
    res.status(201).json(message);
    
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message });
  }
};