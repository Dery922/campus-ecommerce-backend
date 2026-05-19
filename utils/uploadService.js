import cloudinary from '../config/cloudinaryConfig.js'; // 👈 Points directly to your existing configuration file

/**
 * Uploads an in-memory storage file buffer directly to your configured Cloudinary instance
 * @param {Object} file - Raw multer file object stream memory buffer
 * @returns {Promise<string>} - Complete secure absolute HTTPS cloud URL asset string
 */
export const uploadAvatarToCloud = async (file) => {
  try {
    if (!file) return null;

    // Convert raw binary buffer arrays cleanly into a Base64 data URI string
    const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // Dispatch payload data block to your active configured Cloudinary space
    const uploadResult = await cloudinary.uploader.upload(base64File, {
      folder: 'campus_marketplace/avatars', // Organizes files cleanly inside your Cloudinary dashboard
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' }, // Autocrops around human faces tightly
        { quality: 'auto' }, // Automated dynamic size optimization parameter
        { fetch_format: 'auto' } // Enforces lightweight webp format compilation delivery
      ]
    });

    return uploadResult.secure_url; // Returns the absolute "cloudinary.com..." image source link
  } catch (error) {
    console.error("❌ Cloudinary Instance Upload Service Exception:", error);
    throw new Error(`Cloudinary service failure: ${error.message}`);
  }
};
