import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hostel official name is required'],
    trim: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Points to your Manager/User collection
    required: [true, 'Hostel must be assigned to a verified manager']
  },
  location: {
    type: String,
    required: [true, 'Location landmark is required (e.g. UENR Front Gate)'],
    trim: true
  },
  distance: {
    type: String,
    required: [true, 'Proximity context is required (e.g. 3 mins walk)'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Rental price amount is required']
  },
  priceUnit: {
    type: String,
    default: 'academic year', // Standard option for Ghanaian university hostels
    enum: ['academic year', 'semester', 'month']
  },
  availableRooms: {
    type: Number,
    required: [true, 'Total available beds/rooms count is required'],
    min: [0, 'Available rooms cannot be less than 0']
  },
  available: {
    type: Boolean,
    default: true // Automatically shifts to false if availableRooms drops to 0
  },
  images: {
    type: [String], // Array of URLs returned directly from your Cloudinary upload preset
    validate: [arrayLimit, 'Provide at least 1 image of the property']
  },
  amenities: {
    type: [String], // Populated by your dashboard's custom dynamic pill tags layout
    default: []
  },
  description: {
    type: String,
    required: [true, 'Hostel rules, gate curfew, and utility descriptions are required'],
    trim: true
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 1,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false // Set to true if the manager pays for the subscription boost
  }
}, {
  timestamps: true // Automatically injects createdAt and updatedAt fields into Atlas docs
});

// Validation function: Ensures a landlord provides photos
function arrayLimit(val) {
  return val.length > 0;
}

// Pre-save Middleware: Automatically switches availability based on remaining bed count
// Locate this section in models/Hostel.js and replace it:
hostelSchema.pre('save', function(next) {
  if (this.availableRooms === 0) {
    this.available = false;
  } else {
    this.available = true;
  }
 
});

// CHANGE IT TO THIS CLEAN MODERN VERSION:
hostelSchema.pre('save', function() {
  this.available = this.availableRooms > 0;
});


//module.exports = mongoose.model('Hostel', HostelSchema);
export default mongoose.model("Hostel", hostelSchema);