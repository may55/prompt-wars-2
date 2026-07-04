# Wayfinder Frontend Service

This is the frontend client web application for the Wayfinder travel platform, built using **TanStack Start**, **Vite**, **TypeScript**, and **Tailwind CSS**.

---

## Features

* **Interactive Explorer:** Search bar with autocomplete-style suggested cards to fetch curated destination highlights.
* **Cultural Content Cards:** Structured sections presenting attractions, hidden gems, and local narratives.
* **Interactive Guide Chat:** Immersive conversational UI that continues the journey with the Wayfinder AI local guide.
* **Premium Theme Styling:** OKLCH styling token sets, glassmorphic layout utilities, custom layout keyframes, and font pairings.
* **Accessible Component Layout (a11y):** Ornamental hidden tags, live region log roles, and active visible focus borders.

---

## Setup & Running

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment configuration:**
   By default, local API calls hit `http://localhost:3000`. You can configure a custom backend endpoint:
   ```bash
   # Create a local environment file
   echo "VITE_API_URL=https://your-custom-backend-api.com" > .env.local
   ```

3. **Start the development server:**
   ```bash
   bun run dev
   ```

4. **Compile production build:**
   ```bash
   bun run build
   ```

5. **Run test suite:**
   ```bash
   bun run test
   ```
