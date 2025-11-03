const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { type: String },
    age: { type: Number, min: 18, max: 100 },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },
    phone: { type: String, required: true },
    bio: { type: String, required: true },
    reasonToJoin: { type: String, required: true },
    community: { type: String },
    interests: [{ type: String }],
    instagram: { type: String },
    facebook: { type: String },
    youtube: { type: String },
    isPremium: { type: Boolean, default: false },
    likedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    skippedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    notifications: [
      {
        type: {
          type: String,
          enum: ["like", "match", "message"], // extendable
          required: true,
        },
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
