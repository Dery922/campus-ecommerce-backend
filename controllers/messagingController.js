import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Product from "../models/Product.js";

// Update unread count when sending message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, messageType, images } = req.body;
    const senderId = req.user._id;

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      text,
      messageType: messageType || "text",
      images: images || [],
      readBy: [senderId], // Sender has "read" their own message
    });

    const io = req.app.get("io");

    // Get conversation to find other participants
    const conversation = await Conversation.findById(conversationId);

    // Update unread counts for other participants
    const otherParticipants = conversation.participants.filter(
      (p) => p.toString() !== senderId.toString(),
    );

    for (const participant of otherParticipants) {
      await Conversation.findOneAndUpdate(
        {
          _id: conversationId,
          "unreadCounts.user": participant,
        },
        {
          $inc: { "unreadCounts.$.count": 1 },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    // Update last message
    conversation.lastMessage = {
      text: text,
      sender: senderId,
      createdAt: new Date(),
    };
    await conversation.save();

    // Populate and return message
    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name avatar",
    );

    // Emit to conversation room
    io.to(conversationId).emit("receiveMessage", populatedMessage);

    // 2. Send to each "other participant" room (for global unread counts)
    otherParticipants.forEach((participantId) => {
      // This matches the socket.join(userId) we set up in the backend
      io.to(participantId.toString()).emit("receiveMessage", populatedMessage);
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const MessagingStart = async (req, res) => {
  try {
    const senderId = req.user._id; // must come from auth middleware
    const { productId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender or receiver missing" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      product: productId,
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, receiverId],
        product: productId,
      });
      await conversation.save();
    }

    res.status(201).json({ conversation });
  } catch (error) {
    console.error("START CONVERSATION ERROR:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};
// export const sendMessage = async (req, res) => {
//   try {

//     const { conversationId, text } = req.body;

//     const message = await Message.create({
//       conversation: conversationId,
//       sender: req.user._id,
//       text
//     });

//    await Conversation.findByIdAndUpdate(conversationId, {
//       lastMessage: message._id,
//       lastMessageText: messageType === "text" ? text : "📷 Image",
//       lastMessageAt: message.createdAt,
//     });
//     res.json(message);

//   } catch (error) {
//     res.status(500).json({
//       message: error.message
//     });
//   }
// };
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Find conversations the user participates in
    const conversations = await Conversation.find({
      participants: { $in: [userId] },
    }).select("_id");

    const conversationIds = conversations.map((c) => c._id);

    // 2️⃣ Count unread messages
    const unreadCount = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: userId },
      isRead: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("UNREAD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Also add endpoint to mark messages as read
// export const markMessagesAsRead = async (req, res) => {
//   try {
//     const { conversationId } = req.params;
//     const userId = req.user._id;

//     // Mark all messages in this conversation as read where sender is not the current user
//     await Message.updateMany(
//       {
//         conversation: conversationId,
//         sender: { $ne: userId },
//         isRead: false
//       },
//       {
//         isRead: true
//       }
//     );

//     res.json({ success: true });
//   } catch (error) {
//     console.error("Mark messages as read error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
// export const getUserConversations = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const conversations = await Conversation.find({
//       participants: userId
//     })
//       .populate("participants", "name email")
//       .populate("product", "title images price")
//       .sort({ updatedAt: -1 });

//     res.json(conversations);
//   } catch (error) {
//     console.error("Get conversations error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
export const deleteConversation = async (req, res) => {
  console.log("delete conversation");
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // check if the user is part of the conversation
    const isParticipant = conversation.participants.includes(userId);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // delete messages belonging to the conversation
    await Message.deleteMany({ conversation: id });

    // delete conversation
    await conversation.deleteOne();

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "name email avatar")
      .populate("product", "title images price")
      .populate("lastMessage.sender", "name avatar") // Populate the sender in lastMessage
      .sort({ updatedAt: -1 });

    // Transform the data for the frontend
    const transformedConversations = conversations.map((conv) => {
      const convObj = conv.toObject();

      // Get the other participant (not the current user)
      const otherParticipant = convObj.participants.find(
        (p) => p._id.toString() !== userId.toString(),
      );

      return {
        ...convObj,
        sellerName: otherParticipant?.name || "User",
        sellerAvatar: otherParticipant?.avatar,
        lastMessageText: convObj.lastMessage?.text || "No messages yet",
        lastMessageTime: convObj.lastMessage?.createdAt || convObj.updatedAt,
        productTitle: convObj.product?.title,
        productImage: convObj.product?.images?.[0],
        productPrice: convObj.product?.price,
      };
    });

    res.json(transformedConversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Find all unread messages in this conversation where user hasn't read them
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        readBy: { $ne: userId }, // User hasn't read these messages
        sender: { $ne: userId }, // Don't mark own messages as read
      },
      {
        $addToSet: { readBy: userId }, // Add user to readBy array
        $set: { isRead: true, readAt: new Date() },
      },
    );

    // Reset unread count for this user in the conversation
    await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        "unreadCounts.user": userId,
      },
      {
        $set: { "unreadCounts.$.count": 0 },
      },
    );

    // Emit socket event for read receipts
    const io = req.app.get("io");
    io.to(conversationId).emit("messages-read", {
      conversationId,
      userId,
      readAt: new Date(),
    });

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    });

    const unreadCounts = {};
    let totalUnread = 0;

    conversations.forEach((conv) => {
      const userUnread = conv.unreadCounts?.find(
        (uc) => uc.user.toString() === userId.toString(),
      );
      const count = userUnread?.count || 0;
      unreadCounts[conv._id] = count;
      totalUnread += count;
    });

    res.json({
      unreadCounts,
      totalUnread,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//DELETE /api/conversations/:id