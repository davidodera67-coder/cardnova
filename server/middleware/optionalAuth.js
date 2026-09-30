import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Unlike `protect`, this never rejects the request — it just attaches
// req.userEmail if a valid token happens to be present. Used on the public
// card route so we can check "is this signed-in user on the invite list?"
// without requiring everyone to be logged in to view a public card.
export default async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.userEmail = user.email;
    } catch (err) {
      // invalid or expired token — proceed as an anonymous visitor
    }
  }
  next();
}
