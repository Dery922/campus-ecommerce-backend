import Product from "../models/Product.js";


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

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};