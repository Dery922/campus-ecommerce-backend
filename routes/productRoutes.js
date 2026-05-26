import express from "express";
import { addProduct,getMyProducts,deleteProduct,getMyProductCount, getAllProducts, incrementViewCount, updateProduct } from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";


const router = express.Router();


router.post("/products", protect,upload.array("images", 4), addProduct);
router.get("/my-products", protect, getMyProducts);
router.get("/all-products", getAllProducts);
router.delete("/products/:id", protect, deleteProduct);
router.put("/products/:id", protect, updateProduct);
router.get("/my/count", protect, getMyProductCount);
router.patch("/:id/view",protect, incrementViewCount);

export default router;