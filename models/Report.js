import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["bug", "spam", "scam", "abuse", "other"],
      required: true,
    },

    images: [String],

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    targetType: {
      type: String,
      enum: ["product", "user", "message", "other"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "rejected"],
      default: "pending",
    },

    adminNote: {
      type: String,
    },
  },
  { timestamps: true },
);

reportSchema.index(
  { reporter: 1, targetId: 1, targetType: 1 },
  { unique: true },
);
reportSchema.index({ targetId: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ status: 1 });

export default mongoose.model("Report", reportSchema);
