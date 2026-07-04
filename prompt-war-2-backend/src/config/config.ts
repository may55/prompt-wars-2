import * as dotenv from "dotenv";

// Load environment variables (e.g. from local .env)
dotenv.config();

export interface Config {
  port: number;
  aoaiEndpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

/**
 * Validates and returns environment configuration.
 * Accepts a custom environment dictionary for testing purposes.
 */
export function getEnvConfig(env: Record<string, string | undefined> = process.env): Config {
  const aoaiEndpoint = env.AOAI_ENDPOINT;
  const apiKey = env.API_KEY;

  if (!aoaiEndpoint || !apiKey) {
    throw new Error("AOAI_ENDPOINT and API_KEY environment variables are required.");
  }

  return {
    port: parseInt(env.PORT || "3000", 10),
    aoaiEndpoint,
    apiKey,
    deploymentName: env.DEPLOYMENT_NAME || "gpt-4o",
    apiVersion: env.API_VERSION || "2024-08-01-preview",
  };
}
