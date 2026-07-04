# Wayfinder — Discover Destinations & Engage with Local Culture

Wayfinder is a GenAI-powered travel platform designed to help travelers discover destinations across India and engage deeply with local culture, history, legends, and experiences.

The platform uses Generative AI (Azure OpenAI) to recommend main attractions, uncover off-the-beaten-path hidden gems, provide immersive heritage storytelling, list local festivals or events, and host an interactive chat interface with an virtual local guide ("Wayfinder AI").

---

## Repository Structure

```text
├── prompt-war-2-backend/     # Bun + Hono backend service
│   ├── src/
│   │   ├── config/           # Config loading & env validation
│   │   ├── controller/       # Explore & chat handler routers
│   │   ├── model/            # Type definitions and schemas
│   │   ├── repo/             # Session storage layer
│   │   └── service/          # OpenAI Integration & business services
│   └── tests/                # Bun testing suites
│
├── prompt-war-2-frontend/    # TanStack Start + Vite frontend web application
│   ├── src/
│   │   ├── components/ui/    # Shadcn reusable UI components
│   │   ├── routes/           # File-based routes (index.tsx, __root.tsx)
│   │   └── styles.css        # Custom theme variables & glassmorphic utilities
│   └── src/tests/            # Frontend unit testing
│
├── deploy.sh                 # VM deployment shell script
├── deploy.env                # Local deployment configuration (git-ignored)
└── nginx.conf.template       # Nginx server block proxy template
```

---

## Features & Improvements

### 1. Robust Security
* **Dynamic CORS:** Custom configuration via `CORS_ORIGIN` env parameter.
* **Rate Limiting:** Built-in Hono middleware restricts excessive requests per IP (defaults to 30 req/min) to mitigate abuse/financial cost risks.
* **Input Sanitization:** Client inputs are stripped of HTML/XML tags in the controller layer to guard against prompt or script injection.

### 2. Cache Efficiency
* **Sliding Window TTL:** The `InMemorySessionRepository` manages user chat histories utilizing a sliding 2-hour window (refreshed on access) and a background routine to clean expired logs, preventing memory leaks.

### 3. Comprehensive Testing
* **Backend:** Automated suite using `bun test` covering controllers, service interactions (mocked OpenAI calls), configuration validation, and TTL caching logic.
* **Frontend:** Registered `bun test` runner for testing utility functions (like the Tailwind class merger `cn`).

### 4. Accessibility (a11y)
* Decorative icons are fitted with `aria-hidden="true"` to prevent reading vector details to screen readers.
* The interactive guide chat area utilizes `role="log"` and `aria-live="polite"` to dynamically broadcast virtual guide responses.

---

## Quick Start

### Running Locally

1. **Start Backend:**
   ```bash
   cd prompt-war-2-backend
   bun install
   cp .env.example .env  # configure Azure OpenAI keys
   bun run dev
   ```

2. **Start Frontend:**
   ```bash
   cd prompt-war-2-frontend
   bun install
   bun run dev
   ```

### Deployment

Configure your connection settings in `deploy.env` and execute:
```bash
./deploy.sh
```
This automatically updates your main branch on GitHub, pulls the updates on your VM, runs production compilation, manages server states with PM2, and reloads Nginx.
