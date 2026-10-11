import { v2 as cloudinary } from "cloudinary";



const LIMITS = {
  photo: 5 * 1024 * 1024,
  banner_image: 5 * 1024 * 1024,
  banner_video: 30 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
};

function sendToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result))).end(buffer);
  });
}

export async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file was received." });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ message: "File storage isn't configured on the server yet." });
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const { type } = req.body; // "photo" | "banner" | "pdf"
    const isVideo = req.file.mimetype.startsWith("video/");
    const isImage = req.file.mimetype.startsWith("image/");
    const isPdf = req.file.mimetype === "application/pdf";
    const limitKey = type === "banner" ? (isVideo ? "banner_video" : "banner_image") : type;
    const limit = LIMITS[limitKey];

    const validMime =
      (type === "photo" && isImage) ||
      (type === "banner" && (isImage || isVideo)) ||
      (type === "pdf" && isPdf);

    if (!validMime || !limit || req.file.size > limit) {
      return res.status(400).json({
        message: "That file isn't allowed here — check the file type and size limit for this upload slot.",
      });
    }

    const result = await sendToCloudinary(req.file.buffer, {
      folder: "cardnova",
      // PDFs are stored as "raw" files; images/videos use their own type.
      resource_type: isPdf ? "raw" : isVideo ? "video" : "image",
    });

    res.status(201).json({ url: result.secure_url, type: isVideo ? "video" : "image" });
  } catch (err) {
    next(err);
  }
}
