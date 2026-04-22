import type { Context } from "hono";
import { Subscription } from "../models/subscription.model";
import { Types } from "mongoose";
import { getDb } from "../lib/db";

export const toggleSubscription = async (c: Context) => {
    try {
        const user = c.get("user");
        const username = c.req.param("username");

        if (!username?.trim()) {
            return c.json({ error: "Username is required" }, 400);
        }

        const db = getDb();
        if (!db) {
            throw new Error("Database connection is not initialized");
        }

        // Better Auth stores users in the `user` collection, so query it directly.
        const channel = await db.collection("user").findOne({ username: username?.toLowerCase().trim() }, { projection: { _id: 1 } });
        if (!channel) {
            return c.json({ error: `Channel not found with username : ${username}` }, 404);
        }

        // you cannot subscribe to yourself
        if (channel._id.toString() === user.id) {
            return c.json({ error: "You cannot subscribe to yourself" }, 400);
        }

        const subscriptionDeleted = await Subscription.findOneAndDelete({ subscriber: user.id, channel: channel._id });
        if (!subscriptionDeleted) {
            await Subscription.create({ subscriber: user.id, channel: channel._id });
            return c.json({ success: true, message: "Channel subscribed successfully" }, 200);
        }
        return c.json({ success: true, message: "Channel unsubscribed successfully" }, 200);
    } catch (error) {
        throw error;
    }
};

export const getChannelSubscribersAndSubscribedToCount = async (c: Context) => {
    try {
        const username = c.req.param("username");
        if (!username?.trim()) {
            return c.json({ error: "Username is required" }, 400);
        }

        const db = getDb();
        if (!db) {
            throw new Error("Database connection is not initialized");
        }
        const channel = await db.collection("user").findOne({ username: username?.toLowerCase().trim() }, { projection: { _id: 1 } });
        if (!channel) {
            return c.json({ error: `Channel not found with username : ${username}` }, 404);
        }

        const [subscriberCount, subscribedToCount] = await Promise.all([Subscription.countDocuments({ channel: channel._id }), Subscription.countDocuments({ subscriber: channel._id })]);
        const count = {
            subscriberCount,
            subscribedToCount,
        };
        return c.json({ success: true, message: "Counts fetched successfully", count }, 200);
    } catch (error) {
        throw error;
    }
};

export const getChannelSubscribers = async (c: Context) => {
    try {
        const user = c.get("user");
        const username = c.req.param("username");

        if (!username?.trim()) {
            return c.json({ error: "Username is required" }, 400);
        }

        const db = getDb();
        if (!db) {
            throw new Error("Database connection is not initialized");
        }
        const channel = await db.collection("user").findOne({ username: username?.toLowerCase().trim() }, { projection: { _id: 1 } });
        if (!channel) {
            return c.json({ error: `Channel not found with username : ${username}` }, 404);
        }
        const currentUserId = new Types.ObjectId(user.id);

        const subscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new Types.ObjectId(channel._id),
                },
            },
            {
                $lookup: {
                    from: "user",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriber",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                username: 1,
                                image: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$subscriber",
            },
            {
                $project: {
                    _id: 1,
                    subscriber: 1,
                    createdAt: 1,
                },
            },
        ]);
        const subscriberIds = subscribers.map((item) => item.subscriber._id);
        const currentUserSubscriptions = await Subscription.find({
            subscriber: currentUserId,
            channel: { $in: subscriberIds },
        }).select("channel");

        const subscribedChannelIds = new Set(currentUserSubscriptions.map((subscription) => subscription.channel.toString()));
        // subscribedChannelIds  = Set {as29834lkafj, 9028klajsfklj, as235235df, aksd8as7dfasdf, 82934kjnkl}

        const enrichedSubscribers = subscribers.map((item) => ({
            ...item,
            subscriber: {
                ...item.subscriber,
                isSubscribed: subscribedChannelIds.has(item.subscriber._id.toString()),
            },
        }));

        return c.json({ success: true, subscribers: enrichedSubscribers }, 200);
    } catch (error) {
        throw error;
    }
};

export const getSubscribedChannels = async (c: Context) => {
    try {
        const user = c.get("user");
        const username = c.req.param("username");

        if (!username?.trim()) {
            return c.json({ error: "Username is required" }, 400);
        }

        const db = getDb();
        if (!db) {
            throw new Error("Database connection is not initialized");
        }
        const channel = await db.collection("user").findOne({ username: username?.toLowerCase().trim() }, { projection: { _id: 1 } });
        if (!channel) {
            return c.json({ error: `Channel not found with username : ${username}` }, 404);
        }
        const currentUserId = new Types.ObjectId(user.id);

        const subscribedChannels = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new Types.ObjectId(channel._id),
                },
            },
            {
                $lookup: {
                    from: "user",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channel",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                username: 1,
                                image: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$channel",
            },
            {
                $project: {
                    _id: 1,
                    channel: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);

        const currentUserSubscriptions = await Subscription.find({
            subscriber: currentUserId,
            channel: { $in: subscribedChannels.map((subscription) => subscription.channel._id) },
        }).select("channel");

        const subscribedChannelIds = new Set(currentUserSubscriptions.map((subscription) => subscription.channel.toString()));

        const enrichedSubscribedChannels = subscribedChannels.map((item) => ({
            ...item,
            channel: {
                ...item.channel,
                isSubscribed: subscribedChannelIds.has(item.channel._id.toString()),
            },
        }));

        return c.json({ success: true, subscribedChannels: enrichedSubscribedChannels }, 200);
    } catch (error) {
        throw error;
    }
};
