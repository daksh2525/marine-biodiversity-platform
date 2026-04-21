// ── server/middleware/auth.js ─────────────────────────────────────────────────
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "No token provided" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password").lean();
    if (!req.user) return res.status(401).json({ error: "User not found" });
    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    res
      .status(err.name === "TokenExpiredError" ? 403 : 401)
      .json({ error: msg });
  }
};

module.exports = auth;
