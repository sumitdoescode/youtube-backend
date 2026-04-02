import { betterAuth, boolean } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { username } from "better-auth/plugins";
import resend from "../lib/resend";

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = process.env.DB_NAME as string;

if (!MONGODB_URI) {
    throw new Error("Please provide MONGODB_URI in the environment variables");
}

if (!DB_NAME) {
    throw new Error("Please provide DB_NAME in the environment variables");
}

const client = new MongoClient(MONGODB_URI);
const adapter = mongodbAdapter(client.db(DB_NAME));

export const auth = betterAuth({
    database: adapter,
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        sendVerificationEmail: async ({ user, url, token }) => {
            console.log(url);
            const { data, error } = await resend.emails.send({
                from: `onboarding@resend.dev`,
                to: user.email,
                subject: "Verify your email address",
                html: `
                <h1>Verify your email address</h1>
                <p>Click on the link below to verify your email address</p>
                <a href="${url}">Verify your email address</a>
                `,
                // react: EmailVerificationTemplate({ name: user.name, email: user.email, verificationUrl: url }),
            });
            if (error) {
                console.error("EMAIL VERIFICATION SEND ERROR:", {
                    userId: user.id,
                    email: user.email,
                    error,
                });
            }
        },
    },
    plugins: [username()],
    user: {
        additionalFields: {
            coverImage: {
                type: "string",
                required: false,
                defaultValue: null,
            },
            watchHistory: {
                type: "boolean",
                required: false,
                defaultValue: true,
            },
        },
    },
});
