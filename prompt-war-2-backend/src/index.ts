import { Hono } from "hono";
import { cors } from "hono/cors";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
import { AzureOpenAI } from "openai";

// Load environment variables
dotenv.config();

const port = process.env.PORT || "3000";
const aoaiEndpoint = process.env.AOAI_ENDPOINT;
const apiKey = process.env.API_KEY;
const deploymentName = process.env.DEPLOYMENT_NAME || "gpt-4o";
const apiVersion = process.env.API_VERSION || "2024-08-01-preview";

// Validate required environment variables
if (!aoaiEndpoint || !apiKey) {
  console.error("CRITICAL ERROR: AOAI_ENDPOINT and API_KEY environment variables are required.");
  process.exit(1);
}

// Initialize Azure OpenAI client
const client = new AzureOpenAI({
  endpoint: aoaiEndpoint,
  apiKey: apiKey,
  apiVersion: apiVersion,
  deployment: deploymentName,
});

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

// In-memory session store
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Session {
  query: string;
  history: ChatMessage[];
}

const sessions = new Map<string, Session>();

// Helper function to call Azure OpenAI
async function callAzureOpenAI(messages: ChatMessage[], responseJson = false): Promise<string> {
  const response = await client.chat.completions.create({
    model: "", // Ignored by Azure but required by the TypeScript typings
    messages: messages as any,
    response_format: responseJson ? { type: "json_object" } : undefined,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from Azure OpenAI");
  }

  return content;
}

// 1. Explore / Search Endpoint
app.post("/api/explore", async (c) => {
  try {
    const { query } = await c.req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return c.json({ error: "Missing or invalid query parameter" }, 400);
    }

    const systemPrompt = `You are an expert cultural guide specializing in Indian travel, heritage, and history. 
Analyze the user's destination or interest query. Return a JSON object with exactly the following keys:
- "destination": The formatted name of the city/region and state (e.g., "Hampi, Karnataka").
- "attractionsTitle": A catchy title for the primary attractions/hotspots.
- "attractionsDesc": A detailed 3-4 sentence guide to the main attractions focusing on cultural significance.
- "gemTitle": A title for an off-the-beaten-path hidden gem (a quiet monument, local artisan community, or traditional food joint).
- "gemDesc": A compelling description of the hidden gem and how to experience it authentically.
- "story": An immersive, storytelling narrative about the history, a local legend, folklore, or heritage of this place. Make it feel alive and narrative-rich.
- "eventTitle": Title of a major local festival, cultural event, workshop, or local craft experience.
- "eventDesc": Description of the event/experience, highlighting how a traveler can participate.

Ensure all text is creative, high-quality, and addresses the goal of deep cultural connection. Return ONLY valid JSON.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Explore destination or interest query: "${query}"` },
    ];

    console.log(`Calling Azure OpenAI for search query: "${query}"...`);
    const rawContent = await callAzureOpenAI(messages, true);

    // Clean markdown formatting if present
    let jsonString = rawContent.trim();
    if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const parsedResult = JSON.parse(jsonString);
    const sessionId = uuidv4();

    // Store in-memory session with initial context
    sessions.set(sessionId, {
      query,
      history: [
        {
          role: "system",
          content: `You are 'Wayfinder AI', an enthusiastic, knowledgeable local guide for Indian cultural travel. 
Your goal is to answer the user's questions about destinations, food, local customs, events, and folklore.
Be polite, immersive in your storytelling, and help the user connect deeply with local culture.
Keep responses engaging but concise. Avoid generic tourist traps; recommend authentic, respectful, and sustainable cultural engagement.
The user is currently asking about "${parsedResult.destination}". Below is the overview you generated:
- Attractions: ${parsedResult.attractionsTitle} - ${parsedResult.attractionsDesc}
- Hidden Gem: ${parsedResult.gemTitle} - ${parsedResult.gemDesc}
- Story: ${parsedResult.story}
- Event: ${parsedResult.eventTitle} - ${parsedResult.eventDesc}
Please use this context to answer follow-up questions from the user.`
        },
        { role: "user", content: `Tell me about: ${query}` },
        { role: "assistant", content: `I have discovered details about ${parsedResult.destination}. I've shared some highlights regarding its attractions, hidden gems, stories, and cultural events. What would you like to explore further?` }
      ],
    });

    return c.json({
      sessionId,
      ...parsedResult,
    });
  } catch (error: any) {
    console.error("Error in /api/explore:", error);
    return c.json({ error: error.message || "An unexpected error occurred during exploration" }, 500);
  }
});

// 2. Chat Endpoint
app.post("/api/chat", async (c) => {
  try {
    const { sessionId, message } = await c.req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return c.json({ error: "Missing or invalid sessionId" }, 400);
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return c.json({ error: "Missing or invalid message" }, 400);
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ error: "Active session not found or session has expired" }, 404);
    }

    // Add user message to session history
    session.history.push({ role: "user", content: message });

    console.log(`Calling Azure OpenAI for chat session ${sessionId}...`);
    const reply = await callAzureOpenAI(session.history, false);

    // Add assistant reply to session history
    session.history.push({ role: "assistant", content: reply });

    return c.json({ message: reply });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return c.json({ error: error.message || "An unexpected error occurred during chat" }, 500);
  }
});

// Health check endpoint
app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

console.log(`Starting Wayfinder Backend on port ${port}...`);

export default {
  port: parseInt(port, 10),
  fetch: app.fetch,
};
