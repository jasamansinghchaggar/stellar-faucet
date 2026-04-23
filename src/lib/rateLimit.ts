import { connectToDatabase } from "@/lib/mongodb";
import { RateLimitEntryModel } from "@/models/RateLimitEntry";

const CLEANUP_WINDOW_MS = 48 * 60 * 60 * 1000;

export type RateLimitInfo = {
  isLimited: boolean;
  lastRequestAt: Date | null;
  nextAvailableAt: Date | null;
  retryAfterMs: number;
};

function normalizeKey(key: string) {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error("Rate limit key is required");
  }

  return normalizedKey;
}

function toLimitMs(limitHours: number) {
  if (!Number.isFinite(limitHours) || limitHours <= 0) {
    throw new Error("RATE_LIMIT_HOURS must be a positive number");
  }

  return limitHours * 60 * 60 * 1000;
}

function getDefaultLimitHours() {
  const envLimitHours = process.env.RATE_LIMIT_HOURS ?? "24";
  const parsedLimitHours = Number(envLimitHours);

  if (!Number.isFinite(parsedLimitHours) || parsedLimitHours <= 0) {
    throw new Error("RATE_LIMIT_HOURS is invalid");
  }

  return parsedLimitHours;
}

export async function cleanupExpiredRateLimitEntries() {
  await connectToDatabase();

  const cutoffTime = new Date(Date.now() - CLEANUP_WINDOW_MS);
  const result = await RateLimitEntryModel.deleteMany({
    updatedAt: { $lt: cutoffTime },
  });

  return result.deletedCount ?? 0;
}

export async function isRateLimited(
  key: string,
  limitHours = getDefaultLimitHours(),
) {
  await connectToDatabase();
  await cleanupExpiredRateLimitEntries();

  const normalizedKey = normalizeKey(key);
  const limitMs = toLimitMs(limitHours);
  const now = new Date();

  const entry = await RateLimitEntryModel.findOne({
    key: normalizedKey,
  }).lean();

  if (entry) {
    const elapsedMs = now.getTime() - new Date(entry.lastRequestAt).getTime();
    if (elapsedMs < limitMs) {
      return true;
    }
  }

  await RateLimitEntryModel.updateOne(
    { key: normalizedKey },
    {
      $set: {
        key: normalizedKey,
        lastRequestAt: now,
      },
    },
    { upsert: true },
  );

  return false;
}

export async function getRateLimitInfo(
  key: string,
  limitHours = getDefaultLimitHours(),
): Promise<RateLimitInfo> {
  await connectToDatabase();

  const normalizedKey = normalizeKey(key);
  const limitMs = toLimitMs(limitHours);
  const nowMs = Date.now();

  const entry = await RateLimitEntryModel.findOne({
    key: normalizedKey,
  }).lean();

  if (!entry) {
    return {
      isLimited: false,
      lastRequestAt: null,
      nextAvailableAt: null,
      retryAfterMs: 0,
    };
  }

  const lastRequestAt = new Date(entry.lastRequestAt);
  const nextAvailableAt = new Date(lastRequestAt.getTime() + limitMs);
  const retryAfterMs = Math.max(0, nextAvailableAt.getTime() - nowMs);

  return {
    isLimited: retryAfterMs > 0,
    lastRequestAt,
    nextAvailableAt,
    retryAfterMs,
  };
}
