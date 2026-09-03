import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import mongoose from "mongoose";

import { connectDB } from "./config/db.js";

import {
  generateAIResponse,
} from "./services/ai.js";

import {
  registerUser,
  loginUser,
} from "./services/auth.js";

import Conversation from "./models/Conversation.js";

import { protect } from "./middleware/authMiddleware.js";


const app = express();

const PORT =
  process.env.PORT || 5000;

const NODE_ENV =
  process.env.NODE_ENV || "development";


// ========================================
// ENVIRONMENT VALIDATION
// ========================================

const requiredEnvironmentVariables = [
  "MONGODB_URI",
  "JWT_SECRET",
  "GEMINI_API_KEY",
];

for (
  const variable
  of requiredEnvironmentVariables
) {
  if (!process.env[variable]) {
    console.error(
      `Missing environment variable: ${variable}`
    );

    process.exit(1);
  }
}


// ========================================
// SECURITY
// ========================================

app.disable("x-powered-by");

app.set(
  "trust proxy",
  1
);

app.use(
  helmet()
);


// ========================================
// CORS
// ========================================

const allowedOrigins =
  process.env.CLIENT_URL
    ? process.env.CLIENT_URL
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

if (
  NODE_ENV === "production" &&
  allowedOrigins.length === 0
) {
  console.error(
    "CLIENT_URL must be configured in production"
  );

  process.exit(1);
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests
      // and tools such as curl in development.
      if (!origin) {
        return callback(null, true);
      }

      if (
        NODE_ENV !== "production" &&
        allowedOrigins.length === 0
      ) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          "CORS policy blocked this origin"
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);


// ========================================
// BODY PARSER
// ========================================

app.use(
  express.json({
    limit: "100kb",
  })
);


// ========================================
// RATE LIMITERS
// ========================================

const generalLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 300,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      error:
        "Too many requests. Please try again later.",
    },
  });


const authLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 10,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      error:
        "Too many authentication attempts. Please try again later.",
    },
  });


const chatLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    limit: 30,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      error:
        "Too many messages. Please slow down and try again shortly.",
    },
  });


app.use(
  "/api",
  generalLimiter
);


// ========================================
// HEALTH / STATUS
// ========================================

app.get(
  "/api/status",
  (req, res) => {
    res.json({
      message:
        "Backend is connected to VAAS",

      status: "ok",

      environment:
        NODE_ENV,

      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected",
    });
  }
);


// ========================================
// REGISTER
// ========================================

app.post(
  "/api/auth/register",
  authLimiter,

  async (req, res, next) => {
    try {
      const {
        name,
        email,
        password,
      } = req.body;

      if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          error:
            "Name, email and password are required",
        });
      }

      const cleanName =
        name.trim();

      const cleanEmail =
        email.trim().toLowerCase();

      if (
        cleanName.length < 2 ||
        cleanName.length > 50
      ) {
        return res.status(400).json({
          error:
            "Name must be between 2 and 50 characters",
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanEmail
        )
      ) {
        return res.status(400).json({
          error:
            "Please provide a valid email address",
        });
      }

      if (
        password.length < 6 ||
        password.length > 128
      ) {
        return res.status(400).json({
          error:
            "Password must be between 6 and 128 characters",
        });
      }

      const result =
        await registerUser(
          cleanName,
          cleanEmail,
          password
        );

      return res
        .status(201)
        .json(result);

    } catch (error) {
      if (
        error.message ===
        "User already exists"
      ) {
        return res.status(409).json({
          error:
            "User already exists",
        });
      }

      next(error);
    }
  }
);


// ========================================
// LOGIN
// ========================================

app.post(
  "/api/auth/login",
  authLimiter,

  async (req, res, next) => {
    try {
      const {
        email,
        password,
      } = req.body;

      if (
        typeof email !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          error:
            "Email and password are required",
        });
      }

      if (
        email.trim().length === 0 ||
        password.length === 0
      ) {
        return res.status(400).json({
          error:
            "Email and password are required",
        });
      }

      const result =
        await loginUser(
          email,
          password
        );

      return res.json(result);

    } catch (error) {
      if (
        error.message ===
        "Invalid email or password"
      ) {
        return res.status(401).json({
          error:
            "Invalid email or password",
        });
      }

      next(error);
    }
  }
);


// ========================================
// GET ALL CONVERSATIONS
// ========================================

app.get(
  "/api/conversations",
  protect,

  async (req, res, next) => {
    try {
      const conversations =
        await Conversation.find({
          userId: req.userId,
        })
          .sort({
            updatedAt: -1,
          })
          .select(
            "_id userId title interactionId messages createdAt updatedAt"
          );

      return res.json(
        conversations
      );

    } catch (error) {
      next(error);
    }
  }
);


// ========================================
// GET ONE CONVERSATION
// ========================================

app.get(
  "/api/conversations/:id",
  protect,

  async (req, res, next) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !mongoose.isValidObjectId(id)
      ) {
        return res.status(400).json({
          error:
            "Invalid conversation ID",
        });
      }

      const conversation =
        await Conversation.findOne({
          _id: id,

          userId:
            req.userId,
        });

      if (!conversation) {
        return res.status(404).json({
          error:
            "Conversation not found",
        });
      }

      return res.json(
        conversation
      );

    } catch (error) {
      next(error);
    }
  }
);


// ========================================
// DELETE CONVERSATION
// ========================================

app.delete(
  "/api/conversations/:id",
  protect,

  async (req, res, next) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !mongoose.isValidObjectId(id)
      ) {
        return res.status(400).json({
          error:
            "Invalid conversation ID",
        });
      }

      const conversation =
        await Conversation.findOneAndDelete(
          {
            _id: id,

            userId:
              req.userId,
          }
        );

      if (!conversation) {
        return res.status(404).json({
          error:
            "Conversation not found",
        });
      }

      return res.json({
        message:
          "Conversation deleted",
      });

    } catch (error) {
      next(error);
    }
  }
);


// ========================================
// CHAT
// ========================================

app.post(
  "/api/chat",
  protect,
  chatLimiter,

  async (req, res, next) => {
    try {
      const {
        message,
        previousInteractionId,
        conversationId,
      } = req.body;


      // ========================================
      // VALIDATE MESSAGE
      // ========================================

      if (
        typeof message !== "string"
      ) {
        return res.status(400).json({
          error:
            "Message is required",
        });
      }

      const cleanMessage =
        message.trim();

      if (
        cleanMessage.length === 0
      ) {
        return res.status(400).json({
          error:
            "Message is required",
        });
      }

      if (
        cleanMessage.length > 20000
      ) {
        return res.status(400).json({
          error:
            "Message is too long. Maximum 20,000 characters.",
        });
      }


      // ========================================
      // VALIDATE CONVERSATION ID
      // ========================================

      if (
        conversationId &&
        !mongoose.isValidObjectId(
          conversationId
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid conversation ID",
        });
      }


      let conversation;


      // ========================================
      // FIND EXISTING CONVERSATION
      // ========================================

      if (conversationId) {
        conversation =
          await Conversation.findOne({
            _id: conversationId,

            userId:
              req.userId,
          });
      }


      // ========================================
      // CREATE NEW CONVERSATION
      // ========================================

      if (!conversation) {
        conversation =
          new Conversation({
            userId:
              req.userId,

            messages: [],
          });
      }


      // ========================================
      // SAVE USER MESSAGE
      // ========================================

      conversation.messages.push({
        role: "user",

        content:
          cleanMessage,
      });


      // ========================================
      // CREATE TITLE
      // ========================================

      if (
        conversation.messages.length === 1
      ) {
        let title =
          cleanMessage.replace(
            /\s+/g,
            " "
          );

        if (
          title.length > 40
        ) {
          title =
            title.substring(
              0,
              40
            ) + "...";
        }

        conversation.title =
          title;
      }


      // ========================================
      // DETERMINE GEMINI INTERACTION
      // ========================================

      let interactionToContinue =
        null;


      /*
       * Existing conversation:
       *
       * We trust the interaction ID stored
       * in MongoDB instead of blindly trusting
       * the ID sent by the browser.
       *
       * This prevents client-side state from
       * accidentally desynchronizing the
       * Gemini conversation chain.
       *
       * If previousInteractionId is explicitly
       * null/empty, we intentionally start a
       * fresh Gemini interaction. This preserves
       * your existing Edit Message behavior.
       */

      if (
        conversationId &&
        conversation.interactionId &&
        previousInteractionId !== null
      ) {
        interactionToContinue =
          conversation.interactionId;
      }


      // ========================================
      // GENERATE AI RESPONSE
      // ========================================

      let result;

      try {
        result =
          await generateAIResponse(
            cleanMessage,
            interactionToContinue
          );

      } catch (aiError) {
        console.error(
          "Gemini API error:",
          aiError.message
        );


        /*
         * Keep the user's message because
         * the user explicitly sent it.
         *
         * We do NOT expose Gemini's internal
         * error details to the browser.
         */

        const errorMessage =
          "VAAS is temporarily unable to generate a response. Please try again later.";

        conversation.messages.push({
          role:
            "assistant",

          content:
            errorMessage,
        });

        await conversation.save();

        return res.status(200).json({
          response:
            errorMessage,

          interactionId:
            conversation.interactionId ||
            null,

          conversationId:
            conversation._id,
        });
      }


      // ========================================
      // SAVE AI RESPONSE
      // ========================================

      conversation.messages.push({
        role:
          "assistant",

        content:
          result.response,
      });


      // ========================================
      // SAVE GEMINI INTERACTION ID
      // ========================================

      if (
        result.interactionId
      ) {
        conversation.interactionId =
          result.interactionId;
      }


      // ========================================
      // SAVE CONVERSATION
      // ========================================

      await conversation.save();


      // ========================================
      // RESPONSE
      // ========================================

      return res.json({
        response:
          result.response,

        interactionId:
          result.interactionId ||
          null,

        conversationId:
          conversation._id,
      });

    } catch (error) {
      next(error);
    }
  }
);


// ========================================
// API 404
// ========================================

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      error:
        "API endpoint not found",
    });
  }
);


// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (
      error.message ===
      "CORS policy blocked this origin"
    ) {
      return res.status(403).json({
        error:
          "Origin is not allowed",
      });
    }

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        error:
          "Invalid request data",
      });
    }

    if (
      error.name ===
      "MongoServerError" &&
      error.code === 11000
    ) {
      return res.status(409).json({
        error:
          "A record with this information already exists",
      });
    }

    return res.status(500).json({
      error:
        "Internal server error",
    });
  }
);


// ========================================
// DATABASE
// ========================================

await connectDB();


// ========================================
// SERVER
// ========================================

const server =
  app.listen(
    PORT,
    () => {
      console.log(
        `VAAS backend running on port ${PORT}`
      );

      console.log(
        `Environment: ${NODE_ENV}`
      );
    }
  );


// ========================================
// GRACEFUL SHUTDOWN
// ========================================

async function shutdown(
  signal
) {
  console.log(
    `${signal} received. Shutting down...`
  );

  server.close(
    async () => {
      try {
        await mongoose.connection.close();

        console.log(
          "MongoDB connection closed"
        );

        process.exit(0);
      } catch (error) {
        console.error(
          "Shutdown error:",
          error.message
        );

        process.exit(1);
      }
    }
  );
}


process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);