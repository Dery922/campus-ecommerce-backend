import express from "express"

import mongoose from "mongoose";

import Hostel from "../models/Hostel.js";
const router = express.Router();
// ==========================================
// 1. MOBILE APP ENDPOINT: Stream Public Feed
// ==========================================
router.get('/public/feed', async (req, res) => {
  try {
    // Optimized: Pulls only active listings, sorting featured ads first
    const feedingsings = await Hostel.find({ available: true })
      .sort({ isFeatured: -1, createdAt: -1 })
      .select('name price priceUnit location distance images amenities availableRooms rating reviewCount');
      
    res.status(200).json(feedingsings);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve UENR feed timeline' });
  }
});

// ==========================================
// 2. MOBILE APP ENDPOINT: View Single Hostel Details
// ==========================================
router.get('/public/details/:id', async (req, res) => {
  try {
    const property = await Hostel.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Hostel profile not found' });
    
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve detailed hostel data' });
  }
});

// ==========================================
// 3. DASHBOARD ENDPOINT: Onboard New Property
// ==========================================
export const createHostel = async (req, res) => {
  try {
    const newProperty = new Hostel(req.body);
    const savedProperty = await newProperty.save();
    res.status(201).json({ success: true, data: savedProperty });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==========================================
// 4. DASHBOARD ENDPOINT: Update Bed Availability Live
// ==========================================
router.put('/admin/update-rooms/:id', async (req, res) => {
  try {
    const { availableRooms } = req.body;
    
    const targetHostel = await Hostel.findById(req.params.id);
    if (!targetHostel) return res.status(404).json({ success: false, error: 'Property not found' });

    targetHostel.availableRooms = availableRooms;
    // The pre-save automation hook we wrote earlier handles switching availability boolean state automatically
    await targetHostel.save();

    res.status(200).json({ success: true, message: 'Room counts updated instantly' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal system modification failure' });
  }
});
