import Product from "../models/Product.js";
import User from "../models/User.js"


export const addProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      discountPrice,
      condition,
      location,
      campus,
      selectedLocation,
      selectedCampus,
    } = req.body;

    const listingLocation =
      location ||
      campus ||
      selectedLocation ||
      selectedCampus;

    if (!listingLocation) {
      return res.status(400).json({
        message: "Please select your campus location from the top bar before adding a product",
      });
    }

    // ========================================================
    // 🛡️ NEW: 5-LISTING PREMIUM GATEKEEPER
    // ========================================================
    // 1. Fetch the user document from your database model
    const userProfile = await User.findById(req.user.id);
    
    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found." });
    }

    // 2. Validate listing capacity parameters against premium status tags
    if (userProfile.activeListingsCount >= 5 && !userProfile.isPremiumStudent) {
      return res.status(403).json({
        message: "Listing limit reached. Please upgrade to the Premium Pass to list more items.",
      });
    }
    // ========================================================

    const images = req.files?.map((file) => file.path) || [];

    const product = await Product.create({
      title,
      description,
      price,
      category,
      discountPrice,
      condition,
      location: String(listingLocation).trim(),
      images,
      seller: req.user.id, // ← VERY IMPORTANT
    });

    // ========================================================
    // 📈 NEW: INCREMENT COUNTER ON SUCCESSFUL UPLOAD
    // ========================================================
    userProfile.activeListingsCount += 1;
    await userProfile.save();
    // ========================================================

    res.status(201).json(product);
  } catch (error) {
   console.log("ADD PRODUCT BACKEND ERROR:", error);

   res.status(500).json({
      message: error.message,
      stack: error.stack,
   });
}
};


export const getMyProducts = async (req, res) => {
  try {
    const userId = req.user.id;

    const products = await Product.find({ seller: userId }).sort({ createdAt: -1 });
    
    res.status(200).json(products);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const getMyProductCount = async (req, res) => {

  try {
    const count = await Product.countDocuments({
      seller: req.user.id
    });

  

    res.json({ totalProducts: count });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("seller", "name");
    res.json({
      allProducts: products
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ensure owner deletes only their product
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await product.deleteOne();

    res.json({ message: "Product deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // owner check
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    product.title = req.body.title || product.title;
    product.price = req.body.price || product.price;
    product.description =
      req.body.description || product.description;

    product.status = req.body.status || product.status;

    const updatedProduct = await product.save();

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const incrementViewCount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Pulled from your 'protect' auth middleware

    // 1. Find the product first to check if the user already viewed it
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // 2. Check if user already exists in the viewedBy array
    const hasViewed = product.viewedBy.includes(userId);

    let updatedProduct;
    if (!hasViewed) {
      // If new user: Add to array AND increment total views count atomically
      updatedProduct = await Product.findByIdAndUpdate(
        id,
        { 
          $addToSet: { viewedBy: userId }, 
          $inc: { views: 1 } 
        },
        { new: true }
      );
    } else {
      // If repeat user: Just return current data without changing numbers
      updatedProduct = product;
    }

    res.status(200).json({ views: updatedProduct.views });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}