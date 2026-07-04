import { describe, expect, it } from "bun:test";
import { getEnvConfig } from "../../src/config/config";

describe("Configuration Loader", () => {
  it("should successfully parse valid config variables", () => {
    const mockEnv = {
      AOAI_ENDPOINT: "https://mock-openai.azure.com",
      API_KEY: "mock-key",
      PORT: "4000",
      DEPLOYMENT_NAME: "mock-deployment",
      API_VERSION: "mock-version",
    };

    const config = getEnvConfig(mockEnv);

    expect(config.port).toBe(4000);
    expect(config.aoaiEndpoint).toBe("https://mock-openai.azure.com");
    expect(config.apiKey).toBe("mock-key");
    expect(config.deploymentName).toBe("mock-deployment");
    expect(config.apiVersion).toBe("mock-version");
  });

  it("should fallback to defaults when optional parameters are missing", () => {
    const mockEnv = {
      AOAI_ENDPOINT: "https://mock-openai.azure.com",
      API_KEY: "mock-key",
    };

    const config = getEnvConfig(mockEnv);

    expect(config.port).toBe(3000);
    expect(config.deploymentName).toBe("gpt-4o");
    expect(config.apiVersion).toBe("2024-08-01-preview");
  });

  it("should throw an error if AOAI_ENDPOINT is missing", () => {
    const mockEnv = {
      API_KEY: "mock-key",
    };

    expect(() => getEnvConfig(mockEnv)).toThrow(
      "AOAI_ENDPOINT and API_KEY environment variables are required."
    );
  });

  it("should throw an error if API_KEY is missing", () => {
    const mockEnv = {
      AOAI_ENDPOINT: "https://mock-openai.azure.com",
    };

    expect(() => getEnvConfig(mockEnv)).toThrow(
      "AOAI_ENDPOINT and API_KEY environment variables are required."
    );
  });
});
