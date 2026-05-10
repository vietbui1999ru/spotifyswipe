import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const lastfmRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 h"),
      prefix: "rl:lastfm",
    })
  : null;
