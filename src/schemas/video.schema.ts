import { z } from "zod";

export const UploadVideoSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title must be at most 100 characters long"),
    description: z.string().min(1, "Description is required").max(1000, "Description must be at most 1000 characters long"),
    video: z
        .instanceof(File, { message: "Video is required" })
        .refine((file) => file.size <= 50000000, "Video size must be less than 50MB")
        .refine((file) => ["video/mp4", "video/webm"].includes(file.type), "Video must be in mp4 or webm format"),
    thumbnail: z
        .instanceof(File, { message: "Thumbnail is required" })
        .refine((file) => file.size <= 5000000, "Thumbnail size must be less than 5MB")
        .refine((file) => ["image/jpeg", "image/png"].includes(file.type), "Thumbnail must be in jpeg or png format"),
});

export const UpdateVideoSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title must be at most 100 characters long").nullable().optional(),
    description: z.string().min(1, "Description is required").max(1000, "Description must be at most 1000 characters long").nullable().optional(),
    thumbnail: z
        .instanceof(File, { message: "Thumbnail is required" })
        .refine((file) => file.size <= 5000000, "Thumbnail size must be less than 5MB")
        .refine((file) => ["image/jpeg", "image/png"].includes(file.type), "Thumbnail must be in jpeg or png format")
        .nullable()
        .optional(),
});
