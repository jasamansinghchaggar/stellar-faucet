import { type Model, model, models, Schema, type InferSchemaType } from "mongoose";

const RATE_LIMIT_TTL_SECONDS = 48 * 60 * 60;

const rateLimitEntrySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    lastRequestAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "rate_limit_entries",
  },
);

rateLimitEntrySchema.index({ updatedAt: 1 }, { expireAfterSeconds: RATE_LIMIT_TTL_SECONDS });

export type RateLimitEntryDocument = InferSchemaType<typeof rateLimitEntrySchema>;

export const RateLimitEntryModel: Model<RateLimitEntryDocument> =
  (models.RateLimitEntry as Model<RateLimitEntryDocument>) ||
  model<RateLimitEntryDocument>("RateLimitEntry", rateLimitEntrySchema);
