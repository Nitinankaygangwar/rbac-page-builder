/**
 * lib/db.ts
 * Singleton MongoDB connection via Mongoose.
 * Safe for Next.js hot-reload in dev and serverless in prod.
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Define MONGODB_URI in .env.local");
}

interface Cache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: Cache | undefined;
}

const cache: Cache = global.__mongooseCache ?? { conn: null, promise: null };
global.__mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .catch((e) => { cache.promise = null; throw e; });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export default connectDB;