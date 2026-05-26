import express from "express";
import { initializeUpgradePayment, verifyUpgradePayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js"; // Adjust path to match your current auth middleware file

const router = express.Router();

// POST /api/payments/verify-upgrade
// Secure this route using your 'protect' token validation layer so req.user exists
router.post("/payments/verify-upgrade", protect, verifyUpgradePayment);
router.post("/payments/initialize-upgrade", protect, initializeUpgradePayment);

export default router;
