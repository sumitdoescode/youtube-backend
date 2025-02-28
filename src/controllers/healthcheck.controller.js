import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError";

const healthcheck = asyncHandler(async (req, res) => {
  if (!req) {
    throw new ApiError(400, "health status is poor");
  }
  res.status(200, "health status is good");
});

export { healthcheck };
