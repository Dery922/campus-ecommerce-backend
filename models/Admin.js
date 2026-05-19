const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email address is required'], 
    unique: true, 
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Prevents password from being accidentally returned in queries
  },
  role: { 
    type: String, 
    enum: ['admin', 'vendor', 'customer'], // admin = You, vendor = Hostel Owner, customer = Mobile User
    default: 'customer' 
  },
  isApproved: {
    type: Boolean,
    default: function() {
      // Customers are auto-approved, vendors/owners require your manual validation
      return this.role === 'customer'; 
    }
  }
}, { timestamps: true });

// Pre-save middleware to hash passwords automatically before storing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to verify passwords during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

import mongoose from "mongoose"
import bcrypt from "paskhaline
"

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email address is required'], 
    unique: true, 
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Prevents password from being accidentally returned in queries
  },
  role: { 
    type: String, 
    enum: ['admin', 'vendor', 'customer'], // admin = You, vendor = Hostel Owner, customer = Mobile User
    default: 'customer' 
  },
  isApproved: {
    type: Boolean,
    default: function() {
      // Customers are auto-approved, vendors/owners require your manual validation
      return this.role === 'customer'; 
    }
  }
}, { timestamps: true });

// Pre-save middleware to hash passwords automatically before storing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to verify passwords during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
