import express from "express";
import { register, login, passwordReset, getMe,updateProfileAvatar } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { getCurrentUser } from "../controllers/getCurrentUser.js";
import { profileUpload } from "../middleware/profileUpload.js";
import multer from 'multer';

const router = express.Router();

router.get("/me", protect, getCurrentUser);

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional limit lock: 5MB maximum file resolution capacity
});


// ✅ REGISTER ROUTE: Handles Cloudinary during initial signup
router.post('/register', upload.single('avatar'), register);

// ✅ UPLOAD ROUTE: Handles background image swaps directly from your Expo side drawer
// Enforces token checks first, parses the field named 'avatar', then calls the controller function
router.post('/upload-avatar', protect, upload.single('avatar'), updateProfileAvatar);

router.post("/login", login);


router.post("/reset-password", passwordReset);


router.get("/getme",protect, getMe);


export default router;
