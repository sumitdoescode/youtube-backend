import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { Webhook } from "svix";
import { config } from "dotenv";
config();

const router = express.Router();

// Clerk sends raw JSON so we need to parse it as raw
// prefix = "/api/v1/webhook"
router.post(
    "/clerk",
    express.raw({ type: "application/json" }),
    asyncHandler(async (req, res) => {
        console.log("webhook called");
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
        const payload = req.body;
        const headers = req.headers;

        const wh = new Webhook(WEBHOOK_SECRET);

        let event;

        try {
            event = wh.verify(payload, headers); // ✅ This is the proper way
        } catch (err) {
            return res.status(400).send("Invalid signature");
        }
        const { type: eventType, data } = event;
        const { id: clerkId, username, email_addresses, image_url, public_metadata } = data;

        const email = email_addresses?.[0]?.email_address;
        switch (eventType) {
            case "user.created":
                console.log("webhook called for user.created");
                await User.create({
                    clerkId,
                    username: username,
                    email: email,
                    avatar: {
                        url: image_url || "",
                    },
                });
                break;

            case "user.updated":
                console.log("webhook called for user.updated");
                await User.findOneAndUpdate(
                    { clerkId },
                    {
                        username: username,
                        email: email,
                        avatar: {
                            url: image_url || "",
                        },
                    },
                    { new: true }
                );
                break;

            case "user.deleted":
                console.log("webhook called for user.deleted");
                await User.findOneAndDelete({ clerkId });
                break;

            default:
                break;
        }

        return res.status(200).json({ success: true });
    })
);

export default router;
