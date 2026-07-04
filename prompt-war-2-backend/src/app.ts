import { Hono } from "hono";
import { cors } from "hono/cors";
import { ExploreController } from "./controller/explore.controller";
import { ChatController } from "./controller/chat.controller";

export function createApp(exploreController: ExploreController, chatController: ChatController) {
  const app = new Hono();

  // Enable CORS
  app.use(
    "/*",
    cors({
      origin: "*", // Adjust as necessary for production security
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

  // Routes wired to their controller methods
  app.post("/api/explore", (c) => exploreController.explore(c));
  app.post("/api/chat", (c) => chatController.chat(c));

  return app;
}
