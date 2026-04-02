import { z } from "zod";

export const CoverImageSchema = z
    .instanceof(File, { message: "Invalid cover image file" })
    .refine((file) => ["image/jpeg", "image/png"].includes(file.type), {
        message: "Only JPEG and PNG files are allowed",
    })
    .refine((file) => file.size <= 5 * 1024 * 1024, {
        message: "Cover image size must be under 5MB",
    });

export const UserImageSchema = z
    .instanceof(File, { message: "Invalid user image file" })
    .refine((file) => ["image/jpeg", "image/png"].includes(file.type), {
        message: "Only JPEG and PNG files are allowed",
    })
    .refine((file) => file.size <= 3 * 1024 * 1024, {
        message: "User image size must be under 3MB",
    });
