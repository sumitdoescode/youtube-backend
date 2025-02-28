import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError";
import User from "../models/user.model";
import Tweet from "../models/tweet.model";
import Video from "../models/video.model";
import Playlist from "../models/playlist.model";
import mongoose, { isValidObjectId } from "mongoose";

const checkOwnership = asyncHandler(async (resource, userId) => {
  if (!resource?.owner) {
    throw new ApiError(500, "Resource does not have an owner field");
  }
  if (resource.owner.toString() !== userId.toString()) {
    throw new ApiError(500, "Access denied. You are not the owner of this");
  }
});

// fields in playlist model = name, description, videos, owner
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim() || !description?.trim()) {
    throw new ApiError(400, "Name and description are required");
  }
  const user = req.user;
  const playlist = await Playlist.create({
    name: name.trim(),
    description: description?.trim(),
    visibility: "private",
    owner: user._id,
  });
  // when something is created we send status code = 201
  res.status(201).json({ success: true, message: "Playlist created successfully", playlist: playlist });
});

const updatePlaylist = asyncHandler(async (req, res) => {
  // only title and description can be updated
  const user = req.user;
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  await checkOwnership(playlist, user._id);
  const { title, description } = req.body;
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }
  // most prefer findById method as they are fasther
  const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
    $set: {
      title: title?.trim(),
      description: description?.trim(),
    },
  });
  res.status(200).json({ success: true, message: "Playlist updated successfully", playlist: updatedPlaylist });
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  await checkOwnership(playlist, user._id);

  // delete the playlist object
  await playlist.remove();
  res.status(200).json({ success: true, message: "Playlist deleted successfully" });
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  // video can be from any user/channel but the owner of the playlist should be loggedIn user
  const user = req.user;
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // the owner of the playlist should be request sender
  await checkOwnership(playlist, user._id);

  // if video.isPublised is false then throw an error (you can't add video to the playlist if video is not published)
  if (!video.isPublished) {
    throw new ApiError(404, "Video not found");
  }
  // if video is already in playlist then throw an error
  if (playlist.video.includes(videoId)) {
    throw new ApiError(400, "Video already added to the playlist");
  }

  // add videoId to the playlist.videos array
  playlist.videos.push(videoId);
  await playlist.save();

  res.status(200).json({ success: true, message: "Video added successfully" });
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // the owner of the playlist should be you
  await checkOwnership(playlist, user._id);

  // if video is not in playlist then throw an error
  if (!playlist.video.includes(videoId)) {
    throw new ApiError(400, "Video not found in the playlist");
  }

  // finally
  // remove videoId from the playlist.videos array
  await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        video: videoId,
      },
    },
    { new: true }
  );
  res.status(200).json({ success: true, message: "Video removed from playlist successfully" });
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const user = req.user;
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  // playlist video should be visible to the everyone but it depends on the playlist visibility mode
  if (playlist.visibility !== "public") {
    // if the playlist is private then we will check if the ownership of the playlist
    await checkOwnership(playlist, user._id);
  }

  const playlistVideosAggregation = [
    {
      $match: {
        _id: playlistId,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $match: {
              isPublished: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          {
            $unwind: "$owner",
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        title: 1,
        description: 1,
        visibility: 1,
        video: {
          _id: 1,
          title: 1,
          description: 1,
          thumbnail: 1,
          duration: 1,
          views: 1,
          createdAt: 1,
          owner: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ];

  let { page = 1, limit = 1 } = req.query;
  page = Math.max(1, parseInt(page)); // ensuring minimum value of page is 1
  limit = Math.max(1, parseInt(limit)); // ensuring minimum value of limit is 1

  const playlistVideos = await Playlist.aggregatePaginate(Playlist.aggregate(playlistVideosAggregation), {
    page: page,
    limit: limit,
  });

  res.status(200).json({ success: true, message: "Videos fetched successfully", playlistVideos: playlistVideos });
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId  or channelId");
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        visibility: { $eq: "public" }, // only public playlists
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      addFields: {
        totalVideos: { $size: "$video" },
        thumbnail: {
          $arrayElementA: ["$video.thumbnail", 0],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        visibility: 1,
        thumbnail: 1,
        totalVideos: 1,
        createdAt: 1,
        updatedAt: 1,
        video: 0, // remove video field to save memory
      },
    },
  ]);
  if (!playlists.length) {
    throw new ApiError(404, "No playlists found for the user");
  }
  res.status(200).json({ success: true, message: "Playlists fetched successfully", playlists });
});

const togglePlaylistStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // the owner of the playlist should be you
  await checkOwnership(playlist, user._id);

  // toggle visibility between public or private
  playlist.visibility = playlist.visibility === "public" ? "private" : "public";
  await playlist.save();
  res.status(200).json({ success: true, message: `Playlist visibility toggled to ${playlist.visibility}` });
});

export { createPlaylist, updatePlaylist, deletePlaylist, addVideoToPlaylist, removeVideoFromPlaylist, getPlaylistById, getUserPlaylists, togglePlaylistStatus };
