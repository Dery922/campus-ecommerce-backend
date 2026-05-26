import express from "express";
import { deleteConversation, getMessages,getUnreadCount,getUserConversations,markMessagesAsRead,MessagingStart } from "../controllers/messagingController.js";
import { sendMessage } from "../controllers/messagingController.js";
import { protect } from "../middleware/authMiddleware.js";



const router = express.Router();


router.post("/conversations/start", protect, MessagingStart);
router.post("/send", protect, sendMessage);
router.get("/unread-count",protect, getUnreadCount);
router.get("/conversations", protect, getUserConversations);
router.get("/:conversationId", protect,getMessages);
router.put("/:conversationId/read",protect, markMessagesAsRead);
router.delete("/chat/conversations/:id", protect, deleteConversation);
// routes/chatRoutes.js
router.post('/read/:conversationId', protect, markMessagesAsRead);
router.get('/unread-counts', protect, getUnreadCount);



// Conversation management
// router.post("/conversations/start", protect, MessagingStart);
// router.get("/chat/conversations", protect, getUserConversations);
// router.delete("/conversations/:id", protect, deleteConversation);

// // Messages
// router.post("/send", protect, sendMessage);
// router.get("/:conversationId", protect, getMessages);

// // Read receipts & unread counts
// router.put("/:conversationId/read", protect, markMessagesAsRead);  // Changed from GET to PUT
// router.get("/unread-count", protect, getUnreadCount); // Keep this one



//DELETE /api/conversations/:id

export default router;