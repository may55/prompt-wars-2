import { getEnvConfig } from "./config/config";
import { InMemorySessionRepository } from "./repo/session.repo";
import { OpenAIService } from "./service/openai.service";
import { SessionService } from "./service/session.service";
import { ExploreController } from "./controller/explore.controller";
import { ChatController } from "./controller/chat.controller";
import { createApp } from "./app";

let config;
try {
  config = getEnvConfig();
} catch (error: any) {
  console.error(`CRITICAL CONFIGURATION ERROR: ${error.message}`);
  process.exit(1);
}

// 1. Instantiate Repository
const sessionRepository = new InMemorySessionRepository();

// 2. Instantiate Services
const openAIService = new OpenAIService(
  config.aoaiEndpoint,
  config.apiKey,
  config.apiVersion,
  config.deploymentName
);
const sessionService = new SessionService(sessionRepository);

// 3. Instantiate Controllers
const exploreController = new ExploreController(openAIService, sessionService);
const chatController = new ChatController(openAIService, sessionService);

// 4. Create App
const app = createApp(exploreController, chatController);

console.log(`Starting Wayfinder Backend on port ${config.port}...`);

export default {
  port: config.port,
  fetch: app.fetch,
};
