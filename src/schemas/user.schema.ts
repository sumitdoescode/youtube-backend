import { z } from "zod";

export const RegisterUserSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters long").max(16, "Name must be at most 16 characters long"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long").max(32, "Password must be at most 32 characters long"),
    username: z.string().min(3, "Username must be at least 3 characters long").max(16, "Username must be at most 16 characters long"),
});

export const LoginUserSchema = z.object({
    identifier: z.string().min(3, "Email or username is required").max(64, "Email or username is too long"), // can either be username or email
    password: z.string().min(8, "Password must be at least 8 characters long").max(32, "Password must be at most 32 characters long"),
});
