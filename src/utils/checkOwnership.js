import ApiError from "./ApiError.js";

export const checkOwnership = async (resource, userId) => {
    if (!resource?.owner) {
        throw new ApiError(400, "Resource does not have an owner field");
    }
    if (resource.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Access denied. You are not the owner of this");
    }
};

export const checkOwnershipForWatchHistory = async (resource, userId) => {
    if (!resource?.watchedBy) {
        throw new ApiError(400, "Resource does not have an watchedBy field");
    }
    if (resource.watchedBy.toString() !== userId.toString()) {
        throw new ApiError(403, "Access denied. You are not the owner of this");
    }
};
