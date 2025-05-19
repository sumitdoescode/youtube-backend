import express from "express";
import ApiError from "../utils/ApiError";
import asyncHandler from "../utils/asyncHandler";
import User from "../models/User";
import { uploadOnCloudinary } from "../utils/cloudinary";
import WatchHistory from "../models/watchHistory.model";

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, fullName, password } = req.body;
    const fields = [username, email, fullName, password];
    if (fields.some((field) => field?.trim() === "" || field === undefined || field === null)) {
        throw new ApiError(400, "Some fields are missing");
    }
    // if the
    const userExists = await User.findOne({
        $or: [{ username: username, password: password }],
    });
    if (userExists) {
        if (userExists.username === username && userExists.email === email) throw new ApiError(400, "username and email are already exists");
        if (userExists.username === username) throw new ApiError(400, "username already exists");
        if (userExists.email === email) throw new ApiError(400, "email already exists");
    }
    // now fiinally create the user
    const user = await User.create({
        username: username,
        email: email,
        fullName: fullName,
        password: password,
    });

    // remove sensitive data before sending it back to the client
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    res.status(201).json({
        success: true,
        message: "User created successfully",
        user: createdUser,
    });
});

const loginUser = asyncHandler(async (req, res) => {
    // user can either login with username or email (+password)
    const { username, email, password } = req.body;

    if (!username.trim() && !email.trim()) {
        throw new ApiError(400, "Username or email is required");
    }
    if (!password) {
        throw new ApiError(400, "Password is required");
    }
    const user = await User.findOne({
        $or: [{ username: username }, { email: email }],
    });
    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }
    const isPasswordValid = await User.isPasswordCorrect(user.password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }
    // now everything is fine , generate the access token and refresh token
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // save refreshToken to database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // remove sensitive data before sending it back to the client
    const loggedUser = await User.findById(user._id).select("-password -refreshToken");
    res.cookie("accessToken", accessToken, { httpOnly: true, secure: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });
    res.status(200).json({
        success: true,
        message: "User logged in successfully",
        user: loggedUser,
        accessToken: accessToken,
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    const user = req.user;
    user.refreshToken = null;
    res.status(200).clearCookie("accessToken", { httpOnly: true, secure: true }).clearCookie("refreshToken", { httpOnly: true, secure: true }).json({ success: true, message: "User logged out successfully" });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshtoken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshtoken) {
        throw new ApiError(401, "No refresh token provided");
    }
    try {
        const { _id } = jwt.verify(incomingRefreshtoken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(_id);
        // match the refreshTooken
        if (!user || !user.refreshToken || user.refreshToken !== incomingRefreshtoken) {
            throw new ApiError(401, "Invalid refresh token");
        }
        // generate new access token
        const accessToken = user.generateAccessToken();
        res.cookie("accessToken", accessToken, { httpOnly: true, secure: true });
        res.status(200).json({ success: true, message: "Access token generated", accessToken: accessToken });
    } catch (error) {
        throw new ApiError(error.statusCode || 500, error.message);
    }
});

const updateUserPassword = asyncHandler(async (req, res) => {
    // user is already logged
    const user = req.user;
    const [password, newPassword, cNewPassword] = req.body;
    // input validation
    if (!password?.trim() || !newPassword?.trim() || !cNewPassword.trim()) {
        throw new ApiError(400, "All fields are required");
    }

    if (newPassword !== cNewPassword) {
        throw new ApiError(400, "New password and confirmNew  password do not match");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }
    // change the password field to new Password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, message: "Password updated successfully" });
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;
    // removing sensitive fields
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    res.status(200).json({ success: true, message: "User details are", user: loggedInUser });
});

const updateUserDetails = asyncHandler(async (req, res) => {
    const user = req.user;
    const { username, email, fullName } = req.body;
    if (!username.trim() && !email.trim() && !fullName.trim()) {
        throw new ApiError(400, "Atleast one field must be provided");
        // atleast one should have exist
    }

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                username: username,
                email: email,
                fullName: fullName,
            },
        },
        { new: true }
    ).select("-password -refreshToken");
    user.username = username;
    user.email = email;
    user.fullName = fullName;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, message: "User details updated successfully", updatedUser });
});

const setUserAvatar = asyncHandler(async (req, res) => {
    // due to multer middleware avatar is accessible from req.file
    const avatar = req.file;
    const user = req.user;
    if (!avatar) {
        throw new ApiError(400, "No avatar found");
    }
    const avatarLocalPath = avatar?.path;
    // upload the avatar on cloudinary
    const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath);
    if (!avatarCloudinary) {
        throw new ApiError(500, "Failed to upload the avatar on cloudinary");
    }
    // means now file is uploaded successfully
    await user.findByIdAndUpdate(
        user._id,
        {
            $set: {
                avatar: {
                    url: avatarCloudinary?.url || "",
                    publicId: avatarCloudinary?.publicId || "",
                },
            },
        },
        { new: true }
    );
    res.status(200).json({ success: true, message: "Avatar updated successfully" });
});

const setUserCoverImage = asyncHandler(async (req, res) => {
    const user = req.user;
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
    // coverImage successfully uploaded
    await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                coverImage: {
                    url: coverImageCloudinary?.url || "",
                    publicId: coverImageCloudinary?.publicId || "",
                },
            },
        },
        { new: true }
    );
});

const updateUserAvater = asyncHandler(async (req, res) => {
    const user = req.user;
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
    // means now file is uploaded successfully

    // delete the old avatar from the cloudinary
    const deleteAvatarResponse = await deleteFromCloudinary(user.avatar.publicId);
    if (!deleteAvatarResponse?.results !== "ok") {
        throw new ApiError(500, "Failed to delete the old avatar from cloudinary");
    }

    // update the avatar in the database
    await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                avatar: {
                    url: avatarCloudinary?.url || "",
                    publicId: avatarCloudinary?.publicId || "",
                },
            },
        },
        { new: true }
    );
    res.status(200).json({ success: true, message: "Avatar updated successfully", avatar: avatarCloudinary?.url });
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const user = req.user;
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
    // coverImage successfully uploaded

    // delete the old cover image from the cloudinary
    const deleteCoverImageResponse = await deleteFromCloudinary(user.coverImage.publicId);
    if (!deleteCoverImageResponse?.results !== "ok") {
        throw new ApiError(500, "Failed to delete the old cover image from cloudinary");
    }

    // also update the coverImage in database
    await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                coverImage: {
                    url: coverImageCloudinary?.url || "",
                    publicId: coverImageCloudinary?.publicId || "",
                },
            },
        },
        { new: true }
    );
    res.status(200).json({ success: true, message: "Cover image updated successfully", coverImage: coverImageCloudinary?.url });
});

const getChannelDetails = asyncHandler(async (req, res) => {
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
                        if: { $in: [req.user._id, "$subscibers.subscriber"] },
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
                fullName: 1,
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

const toggleWatchHistory = asyncHandler(async (req, res) => {
    const user = req.user;
    const newWatchHistoryStatus = user.watchHistory === "enabled" ? "disabled" : "enabled";
    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                watchHistory: newWatchHistoryStatus,
            },
        },
        { new: true }
    );
    res.status(200).json({ success: true, message: "Watch History updated successfully", user: updatedUser });
});

export { registerUser, loginUser, logoutUser, refreshAccessToken, updateUserPassword, getCurrentUser, updateUserDetails, setUserAvatar, setUserCoverImage, updateUserAvater, updateUserCoverImage, getChannelDetails, toggleWatchHistory };
