// ── server/middleware/roleCheck.js ────────────────────────────────────────────
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const allowRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}`,
        yourRole: req.user.role,
      });
    next();
  };

module.exports = allowRoles;
