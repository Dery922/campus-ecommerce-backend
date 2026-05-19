import express from "express";
import multer from "multer";
import path from "path";
import upload from "../middleware/upload.js";
import fs from "fs";
import { protect } from "../middleware/authMiddleware.js";
import {
  attachmentImages,
  reportIssue,
  resetPassword,
  forgotPassword,
  changeProfileImage,
  generateOtpCode,
  verifyOtpEnd,
} from "../controllers/GeneralController.js";

const router = express.Router();

// Ensure directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
// Create separate directories
const PROFILE_UPLOADS = "uploads/profiles/";
const CHAT_UPLOADS = "uploads/chat-images/";

ensureDirectoryExists(PROFILE_UPLOADS);
ensureDirectoryExists(CHAT_UPLOADS);

// Configure storage for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROFILE_UPLOADS);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// Configure storage for chat images
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CHAT_UPLOADS);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `chat-${uniqueSuffix}${ext}`);
  },
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Create separate multer instances
const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for profile
  fileFilter: imageFileFilter,
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for chat images
  fileFilter: imageFileFilter,
});

// Routes with different upload handlers
router.post(
  "/upload-avatar",
  protect,
  uploadProfile.single("avatar"),
  changeProfileImage
);

router.post(
  "/chat/upload-image",
  protect,
  uploadChat.single("image"),
  attachmentImages
);

router.post("/auth/request-otp", generateOtpCode);
router.post("/auth/verify-otp", verifyOtpEnd);
router.post("/auth/reset-password", resetPassword);
router.post("/report-issue", protect, upload.array("images", 4), reportIssue);
router.post("/auth/forgot-password", forgotPassword);
export default router;