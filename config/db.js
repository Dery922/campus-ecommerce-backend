import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true, // helpful during development
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    console.error(error.message);

    // Exit process if DB fails
    process.exit(1);
  }
};

export default connectDB;
