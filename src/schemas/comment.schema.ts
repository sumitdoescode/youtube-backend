import { z } from "zod";

export const AddCommentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty").max(500, "Comment cannot exceed 500 characters"),
});

export const UpdateCommentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty").max(500, "Comment cannot exceed 500 characters"),
});
