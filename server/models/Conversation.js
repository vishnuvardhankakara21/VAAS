import mongoose from "mongoose";

// ========================================
// MESSAGE SCHEMA
// ========================================

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "assistant"],
    },

    content: {
      type: String,
      required: true,
      maxlength: 20000,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },

  {
    _id: true,
  }
);


// ========================================
// CONVERSATION SCHEMA
// ========================================

const conversationSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      title: {
        type: String,
        default: "New Conversation",
        maxlength: 100,
      },

      interactionId: {
        type: String,
        default: null,
        maxlength: 500,
      },

      messages: {
        type: [messageSchema],
        default: [],
      },
    },

    {
      timestamps: true,
    }
  );


// ========================================
// INDEX
// ========================================

conversationSchema.index({
  userId: 1,
  updatedAt: -1,
});


// ========================================
// MODEL
// ========================================

const Conversation =
  mongoose.model(
    "Conversation",
    conversationSchema
  );

export default Conversation;