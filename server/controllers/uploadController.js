import fs from "fs";

// Max sizes in bytes, matching what the Create Card wizard promises the user.
const LIMITS = {
  photo: 5 * 1024 * 1024,
  banner_image: 5 * 1024 * 1024,
  banner_video: 30 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
};

export async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file was received." });
    }

    const { type } = req.body; // "photo" | "banner" | "pdf" — which wizard slot this came from
    const isVideo = req.file.mimetype.startsWith("video/");
    const isImage = req.file.mimetype.startsWith("image/");
    const limitKey = type === "banner" ? (isVideo ? "banner_video" : "banner_image") : type;
    const limit = LIMITS[limitKey];

    const validMime =
      (type === "photo" && isImage) ||
      (type === "banner" && (isImage || isVideo)) ||
      (type === "pdf" && req.file.mimetype === "application/pdf");

    if (!validMime || !limit || req.file.size > limit) {
      fs.unlink(req.file.path, () => {}); // clean up the rejected file
      return res.status(400).json({
        message: "That file isn't allowed here — check the file type and size limit for this upload slot.",
      });
    }

    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(201).json({ url, type: isVideo ? "video" : "image" });
  } catch (err) {
    next(err);
  }
}
