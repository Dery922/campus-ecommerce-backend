import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import multer from "multer"; // ✅ Add multer import
import fs from "fs"; // ✅ Add fs for directory creation

import Message from "./models/Message.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import messageRoutes from "./routes/messagingRoutes.js";
import generalRoutes from "./routes/generalRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
dotenv.config({ path: path.resolve("./.env") });

// Needed to mimic __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ✅ Create upload directories if they don't exist
const uploadDirs = ["uploads", "uploads/profiles", "uploads/chat-images"];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
});

// ✅ Configure CORS properly - MUST come BEFORE routes
app.use(
  cors({
    origin: "*", // For development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

// ✅ Handle preflight requests
//app.options('*', cors());

// ✅ Body parsers - ORDER MATTERS
// For JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files for uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});




const onlineUsers = new Map();
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    if (!userId) return;
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    
    // Join a room named after their own userId
    // This allows us to send them messages anywhere in the app
    socket.join(userId); 
    io.emit("userOnline", userId);
  });

  socket.on("sendMessage", async (messageData) => {
    try {
      // 1. Save to database
      const newMessage = await Message.create({
        conversation: messageData.conversationId,
        sender: typeof messageData.sender === "object" 
                ? messageData.sender._id 
                : messageData.sender,
        text: messageData.text,
      });

      // 2. Populate so frontend has user details (name/avatar)
      const populatedMessage = await Message.findById(newMessage._id)
        .populate("sender", "name avatar");

      // 3. Emit to the conversation room (for people currently inside the chat)
      io.to(messageData.conversationId).emit("receiveMessage", populatedMessage);

      // 4. ALSO emit to the receiver's personal room (for the unread badge logic)
      if (messageData.receiverId) {
        io.to(messageData.receiverId).emit("receiveMessage", populatedMessage);
      }

    } catch (err) {
      console.error("Socket sendMessage error:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Typing indicators: Emit directly to the receiver's private room
  socket.on("typing", ({ conversationId, receiverId }) => {
    if (receiverId) io.to(receiverId).emit("userTyping", { conversationId });
  });

  socket.on("stopTyping", ({ conversationId, receiverId }) => {
    if (receiverId) io.to(receiverId).emit("userStoppedTyping", { conversationId });
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("userOffline", socket.userId);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

// Connect database
connectDB();

// ✅ Routes - Order doesn't matter much but keep them organized
app.get("/", (req, res) => {
  res.send("API Running");
});
app.set("io", io);
app.use("/api/auth", authRoutes);
app.use("/api", productRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/hostels", hostelRoutes);

// Set io instance on app for access in routes

// ✅ Error handling middleware for multer and general errors
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Max size is 5MB." });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.message === "Only images are allowed") {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server accessible at: http://localhost:${PORT}`);
  console.log(`On network: http://192.168.199.147:${PORT}`);
});
