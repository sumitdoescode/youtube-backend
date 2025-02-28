import mongoose, { mongo } from "mongoose";
import Video from "./video.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avater: {
      url: {
        type: String,
      },
      publicId: {
        type: String,
      },
    },
    coverImage: {
      url: { type: String },
      publicId: { type: String },
    },
    watchHistory: {
      type: String,
      enum: ["enabled", "disabled"],
      default: "enabled",
    },
    password: {
      type: string,
      required: [true, "Password is required"],
      min: [8, "Password should be of alteast 8 characters"],
      max: [14, "Password should not be more than 14 characters"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  const isPasswordCorrect = await bcrypt.compare(password, this.password);
  return isPasswordCorrect;
};

userSchema.method.generateAccessToken = async function () {
  const accessToken = jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
  return accessToken;
};

userSchema.method.generateAccessToken = async function () {
  const accessToken = jwt.sign({ _id: this._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
  return accessToken;
};

const User = mongoose.model("User", userSchema);

export default User;
