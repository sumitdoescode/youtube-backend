import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
    {
        // who is subscribing
        subscriber: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        // who is getting subscribed to
        channel: {
            type: Schema.Types.ObjectId,
            required: true,
        },
    },
    { timestamps: true },
);

subscriptionSchema.index({ subscriber: 1 });
subscriptionSchema.index({ channel: 1 });
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

export const Subscription = model("Subscription", subscriptionSchema);
