import { auth } from "../lib/auth";
import { Context } from "hono";
import { RegisterUserSchema, LoginUserSchema } from "../schemas/user.schema";
import { flattenError } from "zod";
import { put, del } from "@vercel/blob";
import { CoverImageSchema, UserImageSchema } from "../schemas/image.schema";
import mongoose from "mongoose";

export const register = async (c: Context) => {
    try {
        const data = await c.req.json();
        const result = RegisterUserSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { name, email, password, username } = result.data;
        try {
            return await auth.api.signUpEmail({
                body: {
                    email,
                    name,
                    password,
                    username,
                },
                headers: c.req.raw.headers,
                asResponse: true,
            });
        } catch (error) {
            return c.json({ error: error instanceof Error ? error.message : "Error while registering user" }, 400);
        }
    } catch (error) {
        console.error("Error registering user:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const login = async (c: Context) => {
    try {
        const data = await c.req.json(); // identifier, password
        const result = LoginUserSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { identifier, password } = result.data;
        const isEmail = identifier.includes("@");
        if (isEmail) {
            try {
                return await auth.api.signInEmail({
                    body: {
                        email: identifier,
                        password,
                    },
                    headers: c.req.raw.headers,
                    asResponse: true,
                });
            } catch (error) {
                return c.json({ error: error instanceof Error ? error.message : "Error while logging in user" }, 400);
            }
        } else {
            try {
                return await auth.api.signInUsername({
                    body: {
                        username: identifier,
                        password,
                    },
                    headers: c.req.raw.headers,
                    asResponse: true,
                });
            } catch (error) {
                return c.json({ error: error instanceof Error ? error.message : "Error while logging in user" }, 400);
            }
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const logout = async (c: Context) => {
    try {
        return await auth.api.signOut({
            headers: c.req.raw.headers,
            asResponse: true,
        });
    } catch (error) {
        console.error("Error logging out user:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const me = async (c: Context) => {
    const user = c.get("user");
    try {
        return c.json({ success: true, user }, 200);
    } catch (error) {
        console.error("Error getting current user:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const setCoverImage = async (c: Context) => {
    try {
        const user = c.get("user");
        const data = await c.req.formData();
        const coverImage = data.get("coverImage");
        const result = CoverImageSchema.safeParse(coverImage);
        if (!result.success) {
            return c.json({ error: result.error.issues[0]?.message || "Invalid cover image file" }, 400);
        }
        const extension = result.data.type === "image/png" ? "png" : "jpg";
        const oldCoverImage = user.coverImage;

        // uploading the new image to storage
        const { url } = await put(`users/${user.id}/cover-image.${extension}`, result.data, {
            access: "public",
            addRandomSuffix: true,
        });

        try {
            // updating the user's cover image
            await auth.api.updateUser({
                body: {
                    coverImage: url,
                },
                headers: c.req.raw.headers,
            });
        } catch (error) {
            try {
                await del(url);
            } catch (deleteError) {
                console.error("Error deleting new cover image:", deleteError);
            }
            throw error;
        }

        // deleting the old cover image
        if (oldCoverImage) {
            try {
                await del(oldCoverImage);
            } catch (error) {
                console.error("Error deleting old cover image:", error);
            }
        }

        return c.json({ success: true, coverImage: url }, 200);
    } catch (error) {
        console.error("Error setting cover image:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const setImage = async (c: Context) => {
    try {
        const user = c.get("user");
        const data = await c.req.formData();
        const image = data.get("image");
        const result = UserImageSchema.safeParse(image);
        if (!result.success) {
            return c.json({ error: result.error.issues[0]?.message || "Invalid image file" }, 400);
        }
        const extension = result.data.type === "image/png" ? "png" : "jpg";
        const oldImage = user.image;

        // uploading the new image to storage
        const { url } = await put(`users/${user.id}/image.${extension}`, result.data, {
            access: "public",
            addRandomSuffix: true,
        });

        try {
            // updating the user's image
            await auth.api.updateUser({
                body: {
                    image: url,
                },
                headers: c.req.raw.headers,
            });
        } catch (error) {
            try {
                await del(url);
            } catch (deleteError) {
                console.error("Error deleting new image:", deleteError);
            }
            throw error;
        }

        // deleting the old image
        if (oldImage) {
            try {
                await del(oldImage);
            } catch (error) {
                console.error("Error deleting old image:", error);
            }
        }

        return c.json({ success: true, image: url }, 200);
    } catch (error) {
        console.error("Error setting user image:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getUserByUsername = async (c: Context) => {
    try {
        const username = c.req.param("username");
        if (!username) {
            return c.json({ error: "Username is required" }, 400);
        }
        const db = mongoose.connection.db;
        if (!db) {
            return c.json({ error: "Database connection not found" }, 500);
        }
        const user = await db.collection("user").findOne({ username: username.toLowerCase().trim() }, { projection: { _id: 1, name: 1, username: 1, image: 1, coverImage: 1, createdAt: 1, updatedAt: 1 } });
        if (!user) {
            return c.json({ error: `User not found with username : ${username}` }, 404);
        }
        return c.json({ success: true, user }, 200);
    } catch (error) {
        console.error("Error getting user by username:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
