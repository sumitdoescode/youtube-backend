import express from "express";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import WatchHistory from "../models/watchHistory.model.js";
import getAuthenticatedUser from "../utils/authenticatedUser.js";

const getCurrentUser = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    res.status(200).json({ success: true, message: "Current User Fetched", user: loggedInUser });
});

const setUserAvatar = asyncHandler(async (req, res) => {
    // due to multer middleware avatar is accessible from req.file
    const loggedInUser = await getAuthenticatedUser(req);

    const avatar = req.file;

    if (!avatar) {
        throw new ApiError(400, "No avatar found");
    }
    const avatarLocalPath = avatar?.path;
    // upload the avatar on cloudinary
    const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath);
    if (!avatarCloudinary) {
        throw new ApiError(500, "Failed to upload the avatar on cloudinary");
    }

    // is publicId is present then delete the old avatar from the cloudinary
    if (loggedInUser.avatar?.publicId) {
        // delete the old avatar from the cloudinary
        await deleteFromCloudinary(loggedInUser.avatar.publicId);
    }

    // save the avatar in the database
    await User.findByIdAndUpdate(
        loggedInUser._id,
        {
            $set: {
                avatar: {
                    url: avatarCloudinary?.url || "",
                    publicId: avatarCloudinary?.public_id || "",
                },
            },
        },
        { new: true }
    );
    res.status(200).json({ success: true, message: "Avatar updated successfully" });
});

const setUserCoverImage = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const coverImage = req.file;
    if (!coverImage) {
        throw new ApiError(400, "No cover image found");
    }
    const coverImageLocalPath = coverImage?.path;
    // upload the cover image on cloudinary
    const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImageCloudinary) {
        throw new ApiError(500, "Failed to upload the cover image on cloudinary");
    }

    if (loggedInUser.coverImage?.publicId) {
        // delete the old cover image from the cloudinary
        await deleteFromCloudinary(loggedInUser.coverImage.publicId);
    }

    // save the cover image in the database
    await User.findByIdAndUpdate(
        loggedInUser._id,
        {
            $set: {
                coverImage: {
                    url: coverImageCloudinary?.url || "",
                    publicId: coverImageCloudinary?.public_id || "",
                },
            },
        },
        { new: true }
    );
});

const getChannelDetails = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }
    // const user = await User.findOne({ username: username });
    const channelDetails = await User.aggregate([
        {
            $match: { username: username },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscribers",
                as: "subscribedTo",
            },
        },
        {
            $addField: {
                $first: "$subscribers",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                subscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [loggedInUser._id, "$subscibers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                username: 1,
                email: 1,
                avatar: {
                    url: 1,
                },
                coverImage: {
                    url: 1,
                },
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                createdAt: 1,
            },
        },
    ]);
    if (!channelDetails?.length) {
        throw new ApiError(404, "User not found");
    }
    res.status(200).json({ success: true, message: "Channel details fetched successfully", channelDetails: channelDetails[0] });
});

export { getCurrentUser, setUserAvatar, setUserCoverImage, getChannelDetails };
