const express = require("express");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const auth    = require("../middleware/auth");

const router  = express.Router();

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required" });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Invalid email format" });

    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const user = await User.create({ name, email, password, role: role || "fisherman" });

    res.status(201).json({
      token: genToken(user._id),
      user:  { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "No account found with this email" });

    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    user.lastLogin = new Date();
    await user.save();

    res.json({
      token: genToken(user._id),
      user:  { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;