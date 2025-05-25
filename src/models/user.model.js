import mongoose, { mongo } from "mongoose";

const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
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
        avatar: {
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
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
