// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
{
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  text: {
    type: String,
    required: true
  },

  messageType: {
    type: String,
    enum: ["text", "image"],
    default: "text"
  },
  
  images: [
    {
      type: String, // Cloudinary URLs
      default: null
    },
  ],

  isRead: {
    type: Boolean,
    default: false
  },
  
  // NEW: Track which users have read this message
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  
  // NEW: Track when message was read
  readAt: Date
},
{ timestamps: true }
);

export default mongoose.model("Message", messageSchema);