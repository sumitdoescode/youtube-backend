import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Missing Cloudinary credentials");
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

export const uploadFileStream = async (file: File, options: UploadApiOptions) => {
    const resourceType = options.resource_type ?? "image";
    const formData = new FormData();

    formData.append("file", file, file.name);

    for (const [key, value] of Object.entries(options)) {
        if (value === undefined || value === null || key === "resource_type") {
            continue;
        }

        formData.append(key, String(value));
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64")}`,
        },
        body: formData,
    });

    const result = (await response.json()) as UploadApiResponse & { error?: { message?: string } };

    if (!response.ok) {
        throw new Error(result.error?.message || "Cloudinary upload failed");
    }

    return result;
};

export default cloudinary;
