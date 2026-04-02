import { z } from "zod";

export const CreateTweetSchema = z.object({
    content: z.string().min(1, "Tweet content is required").max(280, "Tweet content must be less than 280 characters"),
});

export const UpdateTweetSchema = z.object({
    content: z.string().min(1, "Tweet content is required").max(280, "Tweet content must be less than 280 characters"),
});
