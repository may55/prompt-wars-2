import { Hono } from "hono";
import { cors } from "hono/cors";
import { ExploreController } from "./controller/explore.controller";
import { ChatController } from "./controller/chat.controller";

export const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [ip, info] of rateLimitMap.entries()) {
    if (now > info.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

export function rateLimiter(limit: number = MAX_REQUESTS, windowMs: number = RATE_LIMIT_WINDOW) {
  return async (c: any, next: any) => {
    const path = c.req.path;
    if (!path.startsWith("/api/")) {
      return await next();
    }

    if (rateLimitMap.size > 1000) {
      cleanupRateLimitMap();
    }

    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown-ip";
    const now = Date.now();
    const limitInfo = rateLimitMap.get(ip);

    if (!limitInfo || now > limitInfo.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      limitInfo.count++;
      if (limitInfo.count > limit) {
        return c.json({ error: "Too many requests. Please try again later." }, 429);
      }
    }
    await next();
  };
}

export function createApp(
  exploreController: ExploreController,
  chatController: ChatController,
  corsOrigin: string = "*"
) {
  const app = new Hono();

  // Enable CORS with dynamic origin
  app.use(
    "/*",
    cors({
      origin: corsOrigin,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Apply Rate Limiting
  app.use("/api/*", rateLimiter());

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

  // Routes wired to their controller methods
  app.post("/api/explore", (c) => exploreController.explore(c));
  app.post("/api/chat", (c) => chatController.chat(c));

  return app;
}
