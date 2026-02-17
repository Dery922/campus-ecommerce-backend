import bcrypt from "bcrypt";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

export const register = async (req, res) => {
  try {
    const { fullName, email, studentID, phoneNumber, password } = req.body;

    const existing = await User.findOne({ email });

    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      studentID,
      phoneNumber,
      password: hashed,
      termsAccepted: true
    });

    const token = generateToken(user._id);

    res.status(201).json({ user, token });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    res.json({ user, token });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

