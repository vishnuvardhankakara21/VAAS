import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId: userId.toString(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

export async function registerUser(
  name,
  email,
  password
) {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: cleanEmail,
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    12
  );

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: hashedPassword,
  });

  const token = createToken(user._id);

  return {
    token,

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function loginUser(
  email,
  password
) {
  const cleanEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: cleanEmail,
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const token = createToken(user._id);

  return {
    token,

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  };
}