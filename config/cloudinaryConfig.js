import { v2 as cloudinary } from "cloudinary";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve("./.env") });


try {
  
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

} catch (error) {
  console.log(error)
}

export default cloudinary;