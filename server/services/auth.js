import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const googleClient = new OAuth2Client();


// ============================================================
// TRUSTED EMAIL PROVIDER ALLOWLIST
// Only emails from these known legitimate providers are accepted.
// This is more reliable than a blocklist (which can never be complete).
// ============================================================

const ALLOWED_DOMAINS = new Set([
  // Google
  "gmail.com", "googlemail.com",

  // Microsoft
  "outlook.com", "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de",
  "hotmail.it", "hotmail.es", "live.com", "live.co.uk", "live.fr", "live.de",
  "live.in", "live.nl", "live.be", "live.ca", "live.com.au", "live.com.ar",
  "msn.com", "passport.com",

  // Yahoo
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.fr", "yahoo.de",
  "yahoo.es", "yahoo.it", "yahoo.ca", "yahoo.com.au", "yahoo.com.ar",
  "yahoo.com.br", "yahoo.gr", "yahoo.ro", "yahoo.com.mx", "yahoo.com.ph",
  "ymail.com",

  // Apple
  "icloud.com", "me.com", "mac.com",

  // ProtonMail (privacy-first, legitimate)
  "proton.me", "protonmail.com", "protonmail.ch", "pm.me",

  // Tutanota (privacy-first, legitimate)
  "tutanota.com", "tutanota.de", "tutamail.com", "tuta.io",

  // AOL / Verizon Media
  "aol.com", "aol.co.uk", "aim.com",

  // Zoho
  "zoho.com", "zohomail.com",

  // GMX / Mail.com / Web.de
  "gmx.com", "gmx.net", "gmx.de", "gmx.at", "gmx.ch",
  "mail.com", "web.de",

  // India-specific
  "rediffmail.com",

  // Russia / Eastern Europe
  "mail.ru", "yandex.ru", "yandex.com", "yandex.ua", "yandex.by",
  "yandex.kz", "bk.ru", "list.ru", "inbox.ru", "rambler.ru",

  // Brazil
  "bol.com.br", "uol.com.br", "terra.com.br",

  // Germany
  "t-online.de", "freenet.de", "arcor.de",

  // France
  "laposte.net", "sfr.fr", "wanadoo.fr", "orange.fr", "free.fr",

  // Italy
  "libero.it", "virgilio.it", "tin.it",

  // Spain
  "telefonica.net",

  // China
  "qq.com", "163.com", "126.com", "sina.com", "sina.cn", "sohu.com",
  "aliyun.com",

  // Japan
  "docomo.ne.jp", "softbank.ne.jp", "au.com",

  // UK ISPs
  "btinternet.com", "sky.com", "virginmedia.com", "talktalk.net",

  // Other well-known
  "fastmail.com", "fastmail.fm", "hushmail.com", "disroot.org",
  "riseup.net", "posteo.de", "mailfence.com",
]);

const GMAIL_USERNAME_MIN = 6;
const GMAIL_USERNAME_MAX = 30;

export async function validateEmailAddress(email) {
  if (!email || typeof email !== "string") {
    throw new Error("Please enter an email address");
  }

  const clean = email.trim().toLowerCase();

  if (clean.length > 254) {
    throw new Error("Email address cannot exceed 254 characters");
  }

  // RFC basic syntax check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    throw new Error("Please enter a valid email address");
  }

  const atIndex = clean.lastIndexOf("@");
  const username = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex + 1);

  if (username.length < 2) {
    throw new Error("Email username must be at least 2 characters");
  }

  // ── ALLOWLIST CHECK ──────────────────────────────────────────
  // Only accept emails from known, trusted providers.
  if (!ALLOWED_DOMAINS.has(domain)) {
    throw new Error(
      `Only emails from trusted providers are accepted (e.g. Gmail, Outlook, Yahoo, iCloud, ProtonMail). ` +
      `'@${domain}' is not on the approved list.`
    );
  }

  // Gmail-specific: enforce Google's own username length rules (6–30 chars)
  if (domain === "gmail.com" || domain === "googlemail.com") {
    if (username.length < GMAIL_USERNAME_MIN || username.length > GMAIL_USERNAME_MAX) {
      throw new Error(`Gmail usernames must be between ${GMAIL_USERNAME_MIN} and ${GMAIL_USERNAME_MAX} characters.`);
    }
  }

  return clean;
}

// ============================================================
// CREATE TOKEN
// ============================================================

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}


// ============================================================
// REGISTER
// ============================================================

export async function registerUser(name, email, password) {
  const cleanName = name.trim();
  const cleanEmail = await validateEmailAddress(email);

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    throw new Error("User already exists");
  }

  // bcrypt cost factor: 12 is strong yet performant
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: hashedPassword,
    authProvider: "local",
    lastLoginAt: new Date(),
  });

  const token = createToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      authProvider: user.authProvider,
    },
  };
}


// ============================================================
// LOGIN
// ============================================================

export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: cleanEmail });

  // Use constant-time comparison even when user doesn't exist
  // to prevent user enumeration via timing attacks
  const dummyHash = "$2a$12$invalidhashtopreventtimingattacks";
  const passwordMatch = user && user.password
    ? await bcrypt.compare(password, user.password)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!user || !passwordMatch) {
    throw new Error("Invalid email or password");
  }

  // Update last login timestamp (non-blocking)
  User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).catch(() => {});

  const token = createToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      authProvider: user.authProvider,
    },
  };
}


// ============================================================
// GOOGLE AUTHENTICATION (SECURE ID TOKEN VERIFICATION)
// ============================================================

export async function handleGoogleAuth({ credential }) {
  if (!credential || typeof credential !== "string") {
    throw new Error("A valid Google ID token credential is required");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId || undefined,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn("Google ID token verification failed:", err.message);
    throw new Error("Invalid Google credential");
  }

  if (!payload || !payload.sub) {
    throw new Error("Invalid Google credential");
  }

  if (!payload.email) {
    throw new Error("Google account email is required");
  }

  if (payload.email_verified === false) {
    throw new Error("Google account email is not verified");
  }

  if (clientId && payload.aud && payload.aud !== clientId) {
    throw new Error("Google credential audience mismatch");
  }

  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanName = (payload.name || payload.given_name || cleanEmail.split("@")[0] || "Google User").trim();
  const userGoogleId = payload.sub;
  const userAvatar = payload.picture || null;

  // Find existing user by googleId or verified email
  let user = await User.findOne({
    $or: [
      { googleId: userGoogleId },
      { email: cleanEmail },
    ],
  });

  if (user) {
    // If account was originally local or missing googleId, safely link it
    if (!user.googleId) {
      user.googleId = userGoogleId;
    }
    if (!user.avatar && userAvatar) {
      user.avatar = userAvatar;
    }
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    // Register new user via verified Google identity
    user = await User.create({
      name: cleanName,
      email: cleanEmail,
      googleId: userGoogleId,
      avatar: userAvatar,
      authProvider: "google",
      lastLoginAt: new Date(),
    });
  }

  const token = createToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      authProvider: user.authProvider,
    },
  };
}