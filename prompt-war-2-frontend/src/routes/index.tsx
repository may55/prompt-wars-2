import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Sparkles, ScrollText, ArrowRight, Search, Send, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Wayfinder — Discover Destinations & Local Culture" },
      {
        name: "description",
        content:
          "GenAI-powered cultural travel across India. Discover hidden gems, festivals, heritage stories and authentic experiences.",
      },
      { property: "og:title", content: "Wayfinder — Discover Destinations & Local Culture" },
      {
        property: "og:description",
        content: "Discover destinations and engage with local culture in meaningful ways.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const FEATURES = [
  {
    id: "feat-attractions",
    icon: MapPin,
    title: "Recommend Attractions",
    desc: "AI-driven hotspots tuned to your taste, pace, and season.",
    query: "Recommend attractions in Jaipur for a 3-day cultural trip",
  },
  {
    id: "feat-gems",
    icon: Sparkles,
    title: "Uncover Hidden Gems",
    desc: "Off-the-beaten-path secrets — quiet lanes, forgotten forts, tiny cafés.",
    query: "Uncover hidden gems and local food spots in Varanasi",
  },
  {
    id: "feat-storytelling",
    icon: ScrollText,
    title: "Immersive Storytelling",
    desc: "Audio & text deep-dives into India's living heritage.",
    query: "Immersive storytelling about the heritage of Hampi temples",
  },
];

interface SearchResult {
  sessionId?: string;
  destination: string;
  attractionsTitle: string;
  attractionsDesc: string;
  gemTitle: string;
  gemDesc: string;
  story: string;
  eventTitle: string;
  eventDesc: string;
}

function Index() {
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

  const triggerExploration = async (queryText: string) => {
    if (!queryText.trim()) return;

    setSearchQuery(queryText);
    setIsSearching(true);
    setSearchResult(null);
    setChatMessages([]);

    try {
      const response = await fetch(`${apiBaseUrl}/api/explore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryText }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch exploration results");
      }

      const result = await response.json();
      setSearchResult(result);

      if (result.sessionId) {
        setChatMessages([
          {
            role: "assistant",
            content: `I have discovered details about ${result.destination}. I've shared some highlights regarding its attractions, hidden gems, stories, and cultural events. What would you like to explore further?`,
          },
        ]);
      }
    } catch (err: any) {
      console.error("Explore API call failed:", err);
      toast.warning("Could not reach search service. Showing offline demo data.");

      // Fallback offline mock logic
      const query = queryText.toLowerCase();
      let mockResult: SearchResult;

      if (query.includes("jaipur") || query.includes("attraction")) {
        mockResult = {
          destination: "Jaipur, Rajasthan",
          attractionsTitle: "Amber Fort & Hawa Mahal",
          attractionsDesc: "Amber Fort is a majestic hilltop fortress built in 1592, known for its artistic style elements. Hawa Mahal, the Palace of Winds, features a unique five-story exterior resembling a honeycomb.",
          gemTitle: "Panna Meena ka Kund",
          gemDesc: "A beautiful 16th-century stepwell near Amber Fort. Its symmetrical staircases and emerald green waters make it a quiet architectural masterpiece hidden from mainstream tourist routes.",
          story: "Jaipur was painted terracotta-pink in 1876 by Maharaja Ram Singh to welcome Albert Edward, Prince of Wales. The pink hue represents Rajasthan's legendary warm hospitality.",
          eventTitle: "Jaipur Literature Festival (JLF)",
          eventDesc: "Often described as the 'greatest literary show on Earth', JLF brings together Nobel laureates, novelists, humanitarians, and artists for five days of vibrant debates, music, and art workshops.",
        };
      } else if (query.includes("varanasi") || query.includes("gem")) {
        mockResult = {
          destination: "Varanasi, Uttar Pradesh",
          attractionsTitle: "Dashashwamedh Ghat & Aarti",
          attractionsDesc: "Experience the spectacular Ganga Aarti ceremony where priests perform choreographed rituals using large brass lamps, echoing bells, and traditional chants.",
          gemTitle: "Brown Bread Bakery & Rooftop Music",
          gemDesc: "Tucked inside the narrow lanes near Pandey Ghat, this spot serves organic breads and cheeses with a rooftop terrace hosting nightly live classical sitar and tabla recitals.",
          story: "Varanasi, or Kashi, is believed to be over 3,000 years old. Legend says it was founded by Lord Shiva, making it a sacred threshold where the earthly and spiritual realms converge.",
          eventTitle: "Dev Deepawali (Festival of Light)",
          eventDesc: "Held on Karthik Purnima, every single step of Varanasi's 84 ghats is illuminated with over a million earthen diyas (lamps) in honor of the river Ganga and the gods.",
        };
      } else if (query.includes("hampi") || query.includes("story") || query.includes("heritage")) {
        mockResult = {
          destination: "Hampi, Karnataka",
          attractionsTitle: "Virupaksha Temple & Vittala Chariot",
          attractionsDesc: "Explore the ruins of the Vijayanagara Empire, including the functioning 7th-century Virupaksha Temple and the iconic stone chariot temple dedicated to Lord Vishnu.",
          gemTitle: "Sanapur Lake Coracle Ride",
          gemDesc: "A serene reservoir nestled amidst giant granite boulders. Take a quiet coracle (traditional round bamboo boat) ride on the peaceful waters, far from the bustling ruins.",
          story: "Hampi's Vittala Temple features 56 musical pillars. Legend has it that British engineers were so fascinated they cut two pillars open to find they were hollow blocks of resonant granite.",
          eventTitle: "Hampi Utsav (Vijaya Utsav)",
          eventDesc: "A grand three-day state festival celebrating the heritage of the ruins with traditional music performances, folk dances, puppet shows, and beautiful evening light shows.",
        };
      } else {
        mockResult = {
          destination: queryText,
          attractionsTitle: "Taj Mahal (Agra) & Ajanta Caves",
          attractionsDesc: "Iconic historical monuments. The Taj Mahal is a masterpiece of white marble Mughal architecture. The Ajanta Caves are 30 rock-cut Buddhist temple monuments dating back to 2nd century BCE.",
          gemTitle: "Floating Post Office of Dal Lake",
          gemDesc: "Located in Srinagar, Jammu and Kashmir, it is the only floating post office in the world, housed on a beautiful traditional wooden houseboat.",
          story: "India represents a rich tapestry of cultural traditions, where over 22 official languages and thousands of dialects coexist, creating a living archive of human heritage.",
          eventTitle: "Diwali (The Festival of Lights)",
          eventDesc: "A nation-wide celebration symbolizing the spiritual victory of light over darkness, good over evil, and knowledge over ignorance, marked by beautiful lamps and sharing of sweets.",
        };
      }
      setSearchResult(mockResult);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !searchResult?.sessionId || isSendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsSendingChat(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: searchResult.sessionId,
          message: userMsg,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message to assistant");
      }

      const data = await response.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch (err: any) {
      console.error("Chat API call failed:", err);
      toast.error("Could not send message. Please ensure the backend is running.");
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I am having trouble connecting to the cultural guide service right now. Please ensure the backend server is running and configured correctly.",
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    triggerExploration(searchQuery);
  };

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-center px-6 py-6 shrink-0">
        <Link to="/" id="logo-link" className="font-display text-2xl font-semibold tracking-tight transition hover:opacity-90">
          Way<span className="text-marigold">finder</span>
        </Link>
      </header>

      {/* Hero */}
      <section className={cn(
        "mx-auto flex w-full max-w-2xl flex-col items-center px-6 text-center transition-all duration-300 shrink-0",
        (searchResult || isSearching) ? "pt-4 pb-8" : "flex-1 justify-center py-16 sm:py-24"
      )}>
        <h1 className={cn(
          "font-display font-semibold leading-[1.1] tracking-tight transition-all duration-300",
          (searchResult || isSearching) 
            ? "text-2xl sm:text-4xl" 
            : "text-4xl sm:text-5xl md:text-6xl"
        )}>
          Let's Travel <span className="text-gold-gradient italic">India</span>
        </h1>
        <p className={cn(
          "mt-4 max-w-lg text-balance text-sm text-muted-foreground sm:text-base transition-all duration-300",
          (searchResult || isSearching) && "hidden sm:block"
        )}>
          Discover destinations and engage with local culture in meaningful ways.
        </p>

        {/* Search bar */}
        <form
          id="search-form"
          onSubmit={handleSearch}
          className="glass-strong mt-6 sm:mt-8 flex w-full items-center gap-2 rounded-2xl p-2 pl-4 shadow-[var(--shadow-card)]"
        >
          <Search className="h-4 w-4 shrink-0 text-marigold" aria-hidden="true" />
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Ask about India"
            placeholder="Ask about India's hidden gems or cultural stories…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <button
            id="search-submit-btn"
            type="submit"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-marigold to-[oklch(0.72_0.18_55)] px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Explore
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </form>
      </section>

      {/* Loading State */}
      {isSearching && (
        <section className="mx-auto w-full max-w-2xl px-6 py-12 text-center animate-shimmer shrink-0">
          <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-marigold border-t-transparent" />
            <p className="text-sm text-muted-foreground">Consulting Wayfinder AI for cultural insights...</p>
          </div>
        </section>
      )}

      {/* Search Result */}
      {searchResult && (
        <section className="mx-auto w-full max-w-4xl px-6 pb-16 animate-float-up shrink-0">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-marigold">AI Guide</span>
              <h2 className="text-2xl font-display font-semibold mt-1">Exploration for: {searchResult.destination}</h2>
            </div>
            <button
              onClick={() => {
                setSearchResult(null);
                setSearchQuery("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition underline"
            >
              Clear Result
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attractions */}
            <article className="glass rounded-2xl p-6 relative overflow-hidden">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-marigold mb-3">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> ATTRACTIONS & HOTSPOTS
              </span>
              <h3 className="text-lg font-semibold font-display mb-2">{searchResult.attractionsTitle}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{searchResult.attractionsDesc}</p>
            </article>

            {/* Hidden Gems */}
            <article className="glass rounded-2xl p-6">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-marigold mb-3">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> UNCOVERED HIDDEN GEM
              </span>
              <h3 className="text-lg font-semibold font-display mb-2">{searchResult.gemTitle}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{searchResult.gemDesc}</p>
            </article>

            {/* Storytelling */}
            <article className="glass rounded-2xl p-6 md:col-span-2 bg-gradient-to-br from-white/[0.03] to-white/[0.01]">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-marigold mb-3">
                <ScrollText className="h-3.5 w-3.5" aria-hidden="true" /> IMMERSIVE HERITAGE STORY
              </span>
              <p className="font-display text-base italic text-foreground/90 leading-relaxed pl-4 border-l-2 border-marigold">
                "{searchResult.story}"
              </p>
            </article>

            {/* Local Event & Experiences */}
            <article className="glass rounded-2xl p-6 md:col-span-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-marigold mb-3">
                📅 LOCAL EVENT & EXPERIENCE
              </span>
              <h3 className="text-lg font-semibold font-display mb-2">{searchResult.eventTitle}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{searchResult.eventDesc}</p>
            </article>

            {/* Interactive Chat Guide */}
            <article className="glass rounded-2xl p-6 md:col-span-2 flex flex-col gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-marigold mb-1">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> INTERACTIVE CULTURAL CHAT GUIDE
              </span>
              
              <div
                role="log"
                aria-live="polite"
                className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted"
              >
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "self-end bg-marigold text-primary-foreground rounded-tr-none"
                        : "self-start bg-secondary border border-border text-foreground rounded-tl-none"
                    )}
                  >
                    <span className="text-[10px] opacity-75 font-semibold mb-1 uppercase tracking-wider">
                      {msg.role === "user" ? "You" : "Wayfinder AI"}
                    </span>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="self-start bg-secondary border border-border text-foreground rounded-2xl rounded-tl-none px-4 py-2.5 text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-marigold animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-marigold animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-marigold animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
              </div>

              {searchResult.sessionId ? (
                <form onSubmit={handleSendMessage} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isSendingChat}
                    placeholder="Ask the local guide a question about this destination..."
                    className="flex-1 bg-white/[0.05] border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-marigold focus:ring-1 focus:ring-marigold transition placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={isSendingChat || !chatInput.trim()}
                    className="inline-flex items-center justify-center p-2.5 bg-marigold hover:brightness-110 disabled:opacity-50 text-primary-foreground rounded-xl transition cursor-pointer"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center mt-2 border-t border-border pt-4">
                  Chat session is offline. The backend service was not reachable, so you are viewing offline demo data. Start the backend service to enable interactive chat guide.
                </p>
              )}
            </article>
          </div>
        </section>
      )}

      {/* Suggestions Section */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-16 mt-auto">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4 text-center sm:text-left">
          Suggested Explorations
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.title}
                id={f.id}
                onClick={() => triggerExploration(f.query)}
                className="group text-left glass rounded-2xl p-5 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
              >
                <Icon className="h-4 w-4 text-marigold" aria-hidden="true" />
                <h3 className="font-display mt-3 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
