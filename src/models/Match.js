const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure each match is unique (no duplicates)
MatchSchema.index({ users: 1 }, { unique: true });

module.exports = mongoose.model("Match", MatchSchema);
