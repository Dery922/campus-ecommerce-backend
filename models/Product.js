import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    location:{
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    discountPrice: {
    type: Number,
    default: null
    },   
         condition: {
        type: String,
        enum: ["brand_new", "like_new", "used", "refurbished"],
        required: true
      },
    category: {
      type: String,
      required: true,
    },
 
    images: [
      {
        type: String, // Cloudinary URLs
        default:null
      },
    ],
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);