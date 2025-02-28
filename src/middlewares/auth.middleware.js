// authetication middleware
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError";
import User from "../models/user.model";
import jwt from "jsonwebtoken";

const auth = asyncHandler(async (req, res, next) => {
  // first get accessToken and refreshToken from req.cookies
  const accessToken = req?.cookies?.accessToken || req?.header("Authorization")?.replace("Bearer ", "");
  if (!accessToken) {
    throw new ApiError(401, "Access denied. Please log in.");
  }
  try {
    const { _id } = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(_id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Access denied. Please log in");
  }
});

export default auth;
