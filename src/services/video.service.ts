import { Video } from "../models/video.model";
import { Comment } from "../models/comment.model";
import { Like } from "../models/like.model";
import { Playlist } from "../models/playlist.model";
import { WatchHistory } from "../models/watchHistory.model";
import { Types } from "mongoose";
import cloudinary from "../lib/cloudinary";

export const deleteVideoWithCleanup = async (video: any) => {
    try {
        const comments = await Comment.find({ video: video._id }).select("_id");
        const commentIds = comments.map((comment) => comment._id);

        if (commentIds.length) {
            await Like.deleteMany({ comment: { $in: commentIds } });
        }
        await Promise.all([
            Like.deleteMany({ video: video._id }),
            Comment.deleteMany({ video: video._id }),
            WatchHistory.deleteMany({ video: video._id }),
            Playlist.updateMany(
                { videos: video._id },
                {
                    $pull: {
                        videos: video._id,
                    },
                },
            ),
        ]);

        const videoPublicId = video?.video?.publicId;
        const thumbnailPublicId = video?.thumbnail?.publicId;

        await video.deleteOne();

        if (videoPublicId) {
            try {
                await cloudinary.uploader.destroy(videoPublicId, {
                    resource_type: "video",
                });
            } catch (error) {
                console.error("Error deleting video asset:", error);
            }
        }

        if (thumbnailPublicId) {
            try {
                await cloudinary.uploader.destroy(thumbnailPublicId, {
                    resource_type: "image",
                });
            } catch (error) {
                console.error("Error deleting thumbnail asset:", error);
            }
        }

        return true;
    } catch (error) {
        console.error("DELETE VIDEO WITH CLEANUP ERROR : ", error);
        throw error;
    }
};
