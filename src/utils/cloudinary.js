import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }
        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        fs.unlinkSync(localFilePath);
        return res;
    } catch (error) {
        // if something went wrong w'll delete the file from server
        fs.unlinkSync(localFilePath);
        console.log(error);
        return null;
    }
};

// publicId is required to delete the file that's why we are storing it
const deleteFromCloudinary = async (publicId, resource_type = "image") => {
    try {
        if (!publicId) {
            console.log("publicId is required");
            return null;
        }
        const res = await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
            resource_type: resource_type,
        });
        return res;
    } catch (error) {
        console.log(error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
