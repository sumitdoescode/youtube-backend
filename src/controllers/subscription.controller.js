import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Subscription from "../models/subscription.model.js";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import { parsePagination } from "../utils/parsePagination.js";
import { validateChannelExists } from "../utils/validateExists.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const channel = await validateChannelExists(userId);
    const loggedInUser = await getAuthenticatedUser(req);

    if (loggedInUser._id.toString() === channel._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if the user is already subscribed
        const existingSubscription = await Subscription.findOne({
            subscriber: loggedInUser._id,
            channel: channel._id,
        }).session(session);
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
        await session.commitTransaction();
        res.status(200).json({ success: true, message: subscriptionStatus ? "Channel subscribed Successfully" : "Channel unsubscribed successfully" });
    } catch (error) {
        // if there is any error, rollback the transaction
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

const getChannelSubscribersAndSubscribedToCount = asyncHandler(async (req, res) => {
    // controller for getting subscribers and subscribedTo channel count
    const { userId } = req.params;
    const channel = await validateChannelExists(userId);
    const [subscribersCount, subscribedToCount] = await Promise.all([Subscription.countDocuments({ channel: channel._id }), Subscription.countDocuments({ subscriber: channel._id })]);
    res.status(200).json({
        success: true,
        message: "Subscribers count fetched successfully",
        data: {
            subscribersCount,
            subscribedToCount,
        },
    });
});

const getChannelSubscribers = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { userId } = req.params;

    const channel = await validateChannelExists(userId);

    // Aggregation pipeline to get subscribers and their details
    const subscribersAggregation = [
        { $match: { channel: new mongoose.Types.ObjectId(channel._id) } },
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
                                    if: { $in: [new mongoose.Types.ObjectId(loggedInUser._id), "$subscriberSubscribers.subscriber"] },
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

    // Pagination parameters
    const { page, limit } = parsePagination(req.query);

    // Fetch subscribers with pagination
    const subscribers = await Subscription.aggregatePaginate(Subscription.aggregate(subscribersAggregation), {
        page,
        limit,
    });

    res.status(200).json({
        success: true,
        message: "Subscribers fetched successfully",
        data: {
            subscribers,
        },
    });
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { userId } = req.params;
    const channel = await validateChannelExists(userId);

    const subscribedToAggregation = [
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channel._id),
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
                                    if: { $in: [new mongoose.Types.ObjectId(loggedInUser._id), "$subscribers.subscriber"] },
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

    // Pagination parameters
    const { page, limit } = parsePagination(req.query);

    const subscribedChannels = await Subscription.aggregatePaginate(Subscription.aggregate(subscribedToAggregation), {
        page,
        limit,
    });

    res.status(200).json({
        success: true,
        message: "Subscribed channels fetched successfully",
        data: {
            subscribedChannels,
        },
    });
});

export { toggleSubscription, getChannelSubscribersAndSubscribedToCount, getChannelSubscribers, getSubscribedChannels };
