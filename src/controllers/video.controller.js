import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError";
import User from "../models/user.model";
import Like from "../models/like.model";
import Tweet from "../models/tweet.model";
import Playlist from "../models/playlist.model.js";
import Video from "../models/video.model";
import WatchHistory from "../models/watchHistory.model.js";
import { isValidObjectId } from "mongoose";


// this is some bullshit code right here
// anthoer one bites the dust
const checkOwnership = asyncHandler(async (resource, userId) => {
    if (!resource?.owner) {
        throw new ApiError(500, "Resource does not have an owner field");
    }
    if (resource.owner.toString() !== userId.toString()) {
        throw new ApiError(500, "Access denied. You are not the owner of this");
    }
});

// controller to return all video based on search query
const getAllvideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    // const videos = await Video.find({limit: limit})
    const pipeline = [];
    if (query?.trim()) {
        pipeline.push({});
    }
});

const publishAVideo = asyncHandler(async (req, res) => {
    const user = req.user;
    const { title, description } = req.body;

    // validate fields
    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required");
    }

    const { video, thumbnail } = req.file;
    // both video and thumbnail are required to publish a video
    if (!video || !thumbnail) {
        // if either one of them is missing then throw an error
        if (thumbnail) {
            // delete thumbnail from the server
            fs.unlinkSync(thumbnail[0].path);
        }
        if (video) {
            // delete video from the server
            fs.unlinkSync(video[0].path);
        }
        throw new ApiError(400, "Video and thumbnail are required");
    }

    const videoCloudinary = await uploadOnCloudinary(video[0].path);
    if (!videoCloudinary) {
        throw new ApiError(400, "Failed to upload video on cloudinary");
    }

    const thumbnailCloudinary = await uploadOnCloudinary(thumbnail[0].path);
    if (!thumbnailCloudinary) {
        throw new ApiError(400, "Failed to upload thumbnail on cloudinary");
    }

    const newVideo = await Video.create({
        videoFile: {
            url: videoCloudinary.url,
            publicId: videoCloudinary.publicId,
        },
        thumbnail: {
            url: thumbnailCloudinary.url,
            publicId: thumbnailCloudinary.publicId,
        },
        title: title,
        description: description,
        duration: videoCloudinary.duration || 0,
        views: 0,
        isPublished: true,
        owner: user._id,
    });
    res.status(200).json({ success: true, message: "Video uploaded successfully", video: newVideo });
});

const getVideoById = asyncHandler(async (req, res) => {
    const user = req.user;
    const { videoId } = req.params;
    // videoId validation
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const videoExists = await Video.findById(videoId);
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true,
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "subscriber",
                            as: "subscribedTo",
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
                                    if: { $in: [user?._id, "$subscribers.channel"] },
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
            $unwind: "$owner",
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                videoFile: 1,
                thumbnail: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    subscribersCount: 1,
                    subscribedToCount: 1,
                    isSubscribed: 1,
                },
                likesCount: 1,
                isLiked: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);
    // increase the video views
    videoExists.views++;
    await videoExists.save();

    // add video to watchHistory
    await WatchHistory.create({
        video: videoId,
        watchedBy: user?._id,
    });

    // send response
    res.status(200).json({ success: true, message: "Video Successfully Fetched", video: video });
});

const updateAVideo = asyncHandler(async (req, res) => {
    // user should only be allowed to update title, description, thumbnail not the actual video
    const user = req.user;
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid VideoId");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    await checkOwnership(video, user._id);

    const { title, description } = req.body;
    if (!title.trim() || !description.trim()) {
        throw new ApiError(400, "Title and description are required");
    }

    let thumbnail = req.file;
    if (thumbnail) {
        // then user also wants to update the thumbnail

        // upload new thumbnail on cloudinary
        const thumbnailCloudinary = await uploadOnCloudinary(thumbnail?.path);
        if (!thumbnailCloudinary) {
            throw new ApiError(500, "Couldn't upload thumbnail on cloudinary");
        }

        // delete the old thumbnail on cloudinary
        const deleteThumbnailResponse = await deleteFromCloudinary(video?.thumbnail?.publicId);
        if (!deleteThumbnailResponse) {
            throw new ApiError(500, "Couldn't delete old thumbnail from cloudinary");
        }
        // update videoFileds regarding the new thumbnail
        video.thumbnail.url = thumbnailCloudinary.url;
        video.thumbnail.publicId = thumbnailCloudinary.publicId;
    }

    // update the videoFields of title and description
    video.title = title;
    video.description = description;
    await video.save();

    res.status(200).json({ success: true, message: "Video updated successfully", video });
});

const deleteAVideo = asyncHandler(async (req, res) => {
    const user = req.user;
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    await checkOwnership(video, user._id);

    // delete the video from cloudinary
    const deleteVideoResponse = await deleteFromCloudinary(video?.videoFile?.publicId);
    if (!deleteVideoResponse) {
        throw new ApiError(500, "Couldn't delete video from cloudinary");
    }

    // delete the video from database
    await video.remove();

    res.status(200).json({ success: true, message: "Video deleted successfully" });
});

const toggleVideoStatus = asyncHandler(async (req, res) => {
    const user = req.user;
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // only video owner should be able to publish/unpublish the video
    await checkOwnership(video, user._id);

    // update the video status
    video.isPublished = !video.isPublished;
    await video.save();

    // if video is unpublished then remove it from likedVideos, playlist and watchHistory
    // if (!video.isPublished) {
    // if video is not published
    // await Like.deleteMany({ video: videoId });
    // this query will delete likes data related to that video
    // if owner of the video unpublished the video and then publis the video again it will remove all the likes related data of the video
    // await Playlist.updateMany({ owner: user._id, video: videoId }, { $pull: { video: videoId } });
    // this query will delete watch history data related to that video
    // await WatchHistory.deleteMany({ video: videoId });

    // await Playlist.findByIdAndUpdate(
    //   playlistId,
    //   {
    //     $pull: {
    //       video: videoId,
    //     },
    //   },
    //   { new: true }
    // );
    // }
    res.status(200).json({ success: true, message: "Video status updated successfully", video: video });
});

export { getAllvideos, publishAVideo, getVideoById, updateAVideo, deleteAVideo, toggleVideoStatus };
