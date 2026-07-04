# Wayfinder Backend Service

This is the GenAI-powered backend service for the Wayfinder travel exploration platform, built using Bun, Hono, TypeScript, and Azure OpenAI API (chatgpt-4o model).

## Features

- **CORS Support**: Configured to work dynamically using environment-defined origins (`CORS_ORIGIN`).
- **Rate Limiting**: Built-in in-memory rate limiter middleware to protect endpoints against request spam.
- **Input Sanitization**: Client parameters are sanitised by stripping HTML/XML tags to protect against script/prompt injection.
- **Sliding Session Cache (TTL)**: Stores session histories with a 2-hour sliding TTL, including automated background cleaning to prevent memory leaks.
- **AI-Powered Search & Discovery (`/api/explore`)**: Returns structured data containing destination, attractions, hidden gems, stories, and local event recommendations.
- **Contextual Conversational Sessions (`/api/chat`)**: Allows users to chat interactively with a virtual local guide assistant seeded with the discovery history context.

## Prerequisites

Ensure you have [Bun](https://bun.sh/) installed.

## Setup & Running

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Configure environment variables**:
   Duplicate `.env.example` as `.env` and fill in your Azure OpenAI configuration details:
   ```bash
   cp .env.example .env
   ```

3. **Start the development server (with auto-reload)**:
   ```bash
   bun run dev
   ```

4. **Start in production mode**:
   ```bash
   bun run start
   ```

## API Endpoint Reference

### 1. Initial Exploration Search
- **Route**: `POST /api/explore`
- **Body**: `{ "query": "destination string" }`
- **Response**: Returns structured search object (`destination`, `attractionsTitle`, `attractionsDesc`, `gemTitle`, `gemDesc`, `story`, `eventTitle`, `eventDesc`) along with a `sessionId` key.

### 2. Live Cultural Chat Session
- **Route**: `POST /api/chat`
- **Body**: `{ "sessionId": "UUID", "message": "user continuation query" }`
- **Response**: `{ "message": "assistant response" }`
