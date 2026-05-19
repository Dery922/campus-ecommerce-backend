// models/Conversation.js
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: Date,
    },
    
    // NEW: Track unread counts per user
    unreadCounts: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      count: {
        type: Number,
        default: 0
      }
    }]
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);