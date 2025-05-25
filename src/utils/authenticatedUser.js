import ApiError from "./ApiError.js";
import User from "../models/user.model.js";

const getAuthenticatedUser = async (req) => {
    const clerkId = req.auth.userId;
    if (!clerkId) throw new ApiError(400, "Invalid clerkId");
    const user = await User.findOne({ clerkId });
    if (!user) throw new ApiError(404, "User not found");
    return user;
};

export default getAuthenticatedUser;
