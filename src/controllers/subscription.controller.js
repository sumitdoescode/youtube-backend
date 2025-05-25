import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import getAuthenticatedUser from "../utils/authenticatedUser.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }
    const channel = await User.findById(userId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }
    const loggedInUser = await getAuthenticatedUser(req);
    // Check if the user is already subscribed
    const existingSubscription = await Subscription.findOne({
        subscriber: loggedInUser._id,
        channel: channel._id,
    });
    let subscriptionStatus;
    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);
        subscriptionStatus = false;
    } else {
        const subscription = new Subscription({
            subscriber: loggedInUser._id,
            channel: channel._id,
        });
        await subscription.save();
        subscriptionStatus = true;
    }
    res.status(200).json({ success: true, message: subscriptionStatus ? "Channel subscribed Successfully" : "Channel unsubscribed successfully" });
});

const getChannelSubscribersAndSubscribedToCount = asyncHandler(async (req, res) => {
    // controller for getting subscribers and subscribedTo channel count
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }
    const channel = await User.findById(userId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }
    const subscribersCount = await Subscription.countDocuments({ channel: channel._id });
    const subscribedToCount = await Subscription.countDocuments({ subscriber: channel._id });
    res.status(200).json({ success: true, message: "Subscribers count fetched successfully", subscribersCount, subscribedToCount });
});

const getChannelSubscribers = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { userId } = req.params;

    // Validate channelId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    // Check if the channel exists
    const channel = await User.findById(userId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // Pagination parameters
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(page, 1);
    limit = Math.max(limit, 10);

    // Aggregation pipeline to get subscribers and their details
    const subscribersAggregation = [
        { $match: { channel: mongoose.Types.ObjectId(channel._id) } },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscriberSubscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscriberSubscribers" },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [mongoose.Types.ObjectId(loggedInUser._id), "$subscriberSubscribers.subscriber"] },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                ],
            },
        },
        { $unwind: "$subscriber" },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                subscriber: {
                    _id: 1,
                    username: 1,
                    avatar: { url: 1 },
                    subscribersCount: 1,
                    isSubscribed: 1,
                },
            },
        },
    ];

    // Fetch subscribers with pagination
    const subscribers = await Subscription.aggregatePaginate(Subscription.aggregate(subscribersAggregation), {
        page: Number(page),
        limit: Number(limit),
    });

    res.status(200).json({
        success: true,
        message: "Subscribers fetched successfully",
        subscribers,
    });
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }
    const channel = await User.findById(userId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const subscribedToAggregation = [
        {
            $match: {
                subscriber: mongoose.Types.ObjectId(channel._id),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscribers" },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [mongoose.Types.ObjectId(loggedInUser._id), "$subscribers.subscriber"] },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$channel",
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $project: {
                channel: {
                    _id: 1,
                    username: 1,
                    avatar: { url: 1 },
                    subscribersCount: 1,
                    isSubscribed: 1,
                    createdAt: 1,
                },
            },
        },
    ];

    let { page = 1, limit = 1 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

    const subscribedChannels = await Subscription.aggregatePaginate(Subscription.aggregate(subscribedToAggregation), {
        page: parseInt(page),
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        message: "Subscribed channels fetched successfully",
        subscribedChannels,
    });
});

export { toggleSubscription, getChannelSubscribersAndSubscribedToCount, getChannelSubscribers, getSubscribedChannels };
