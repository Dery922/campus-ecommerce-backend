import express from "express";
import { addProduct,getMyProducts,deleteProduct,getMyProductCount, getAllProducts } from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";


const router = express.Router();


router.post("/products", protect,upload.array("images", 4), addProduct);
router.get("/my-products", protect, getMyProducts);
router.get("/all-products", getAllProducts);
router.delete("/products/:id", protect, deleteProduct);
router.get("/my/count", protect, getMyProductCount);

export default router;