import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js'; // Ensure file extension is explicitly defined

// 🔑 FORCE EXPLICIT RELATIVE FILE PATH LINK TO ROOT DIRECTORY ENVIRONMENT FILE
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const seedSuperAdmin = async () => {
  try {
    // 1. Establish independent database connection
    await mongoose.connect(process.env.MONGO_URI);
    console.log('⏳ Connected to database for seeding...');

    // 2. Check if the Super Admin user profile already exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });
    
    if (adminExists) {
      console.log('ℹ️ Super Admin account already exists. Seeding skipped.');
      process.exit(0);
    }

    // 3. Construct the Super Admin entity 
    const superAdmin = new User({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      passwordHash: process.env.ADMIN_PASSWORD, // Pre-save hooks will auto-hash this safely
      role: 'admin',
      isApproved: true
    });

    // 4. Save to the cluster
    await superAdmin.save();
    console.log('🚀 Super Admin account successfully initialized!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error executing database seed:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
