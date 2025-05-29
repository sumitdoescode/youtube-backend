import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

const healthcheck = asyncHandler(async (req, res) => {
    if (!req) {
        throw new ApiError(400, "health status is poor");
    }
    res.status(200).json({ success: true, message: "health status is good" });
});

export { healthcheck };
