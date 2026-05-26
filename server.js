import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import multer from "multer"; 
import fs from "fs"; 

import Message from "./models/Message.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import messageRoutes from "./routes/messagingRoutes.js";
import generalRoutes from "./routes/generalRoutes.js";
import hostelRoutes from "./routes/hostelRoutes.js";
import paymentsRoutes from "./routes/paymentRoutes.js"

// Load configuration environment variables instantly
dotenv.config({ path: path.resolve("./.env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. INITIALIZE DATABASE FIRST
connectDB();

const app = express();
const server = http.createServer(app);

// 2. CREATE NECESSARY DIRECTORIES
const uploadDirs = ["uploads", "uploads/profiles", "uploads/chat-images"];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
});

// 3. STANDARD APPLICAION MIDDLEWARES
app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 4. MAP YOUR ROUTE LAYERS BEFORE SOCKET MANAGEMENT
app.get("/", (req, res) => {
  res.send("API Running");
});

app.use("/api/auth", authRoutes);
app.use("/api", productRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api", generalRoutes);
app.use("/api", paymentsRoutes);

// 5. INITIALIZE SOCKET.IO WITH CORRECT CORS HANDSHAKES
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"] // Ensures both fallbacks are enabled safely
});

app.set("io", io);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ [Socket Connection] User connected successfully:", socket.id);

  socket.on("join", (userId) => {
    if (!userId) return;
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    socket.join(userId); 
    io.emit("userOnline", userId);
    console.log(`👤 User ${userId} joined their socket channel.`);
  });

  socket.on("sendMessage", async (messageData) => {
    try {
      // Save message to database
      const newMessage = await Message.create({
        conversation: messageData.conversationId,
        sender: typeof messageData.sender === "object" 
                ? messageData.sender._id 
                : messageData.sender,
        text: messageData.text,
      });

      const populatedMessage = await Message.findById(newMessage._id)
        .populate("sender", "name avatar");

      // Emit text data universally
      io.to(messageData.conversationId).emit("receiveMessage", populatedMessage);

      if (messageData.receiverId) {
        io.to(messageData.receiverId).emit("receiveMessage", populatedMessage);
      }

    } catch (err) {
      console.error("❌ Socket sendMessage error:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

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
    console.log("🔌 Socket disconnected:", socket.id);
  });
});

// 6. GLOBAL ERROR HANDLING CONTAINER
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
