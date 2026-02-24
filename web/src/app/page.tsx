"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Mode = "url" | "stack" | "discover" | "find" | "category";

interface Alternative {
  name: string;
  type: "ai_native" | "open_source" | "cheaper_saas" | "build_internal";
  url?: string;
  estimated_savings: string;
  migration_difficulty: "easy" | "medium" | "hard";
  description: string;
}

interface LockInStrategy {
  lock_in_type: string;
  severity: "low" | "medium" | "high";
  escape_tactic: string;
  timeline: string;
}

interface VulnerabilityScore {
  product_name: string;
  core_function: string;
  vulnerability_score: number;
  replacement_timeline: string;
  replacement_mechanism: string;
  moat_factors: string[];
  negotiation_leverage: string;
  comparable_at_risk: string[];
  estimated_annual_cost: number | null;
  alternatives?: Alternative[];
  vendor_lock_in?: LockInStrategy[];
  escape_plan?: string;
  negotiation_script?: string;
}

interface ScoredProduct {
  success: boolean;
  url: string;
  score?: VulnerabilityScore;
  error?: string;
}

interface Savings {
  totalEstimatedCost: number;
  negotiableProducts: number;
  potentialSavings: number;
  discountPercent: number;
}

interface DiscoveredProduct {
  name: string;
  category: string;
  url: string | null;
  confidence: string;
  sources: string[];
  evidence: string[];
}

interface CompanyInfo {
  name: string;
  industry: string;
  size_estimate: string;
  tech_sophistication: string;
}

interface FoundCompany {
  name: string;
  industry: string;
  size: string;
  confidence: string;
  source: string;
  domain?: string;
}

interface CategoryProduct {
  name: string;
  url: string;
  market_position: string;
  vulnerability_estimate: number;
  key_vulnerability: string;
  key_moat: string;
}

interface AIAlternative {
  name: string;
  url: string;
  threat_level: string;
  description: string;
}

interface Suggestion {
  name: string;
  domain?: string;
  industry?: string;
  category?: string;
  users?: string;
  products?: number;
  examples?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("discover");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input states
  const [url, setUrl] = useState("");
  const [stackUrls, setStackUrls] = useState("");
  const [company, setCompany] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [categoryName, setCategoryName] = useState("");

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Results states
  const [singleResult, setSingleResult] = useState<VulnerabilityScore | null>(null);
  const [stackResults, setStackResults] = useState<ScoredProduct[] | null>(null);
  const [stackSavings, setStackSavings] = useState<Savings | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredProduct[] | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [discoverScores, setDiscoverScores] = useState<ScoredProduct[] | null>(null);
  const [discoverSavings, setDiscoverSavings] = useState<Savings | null>(null);
  const [foundCompanies, setFoundCompanies] = useState<FoundCompany[] | null>(null);
  const [findNotes, setFindNotes] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<CategoryProduct[] | null>(null);
  const [categoryAlternatives, setCategoryAlternatives] = useState<AIAlternative[] | null>(null);
  const [categoryInfo, setCategoryInfo] = useState<{
    market_size_estimate: string;
    ai_disruption_stage: string;
    disruption_timeline: string;
    procurement_advice: string;
  } | null>(null);

  // Get current input value based on mode
  const getCurrentInput = useCallback(() => {
    switch (mode) {
      case "discover": return company;
      case "find": return searchProduct;
      case "category": return categoryName;
      default: return "";
    }
  }, [mode, company, searchProduct, categoryName]);

  const debouncedQuery = useDebounce(getCurrentInput(), 200);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (mode === "url" || mode === "stack") {
        setSuggestions([]);
        return;
      }

      const type = mode === "discover" ? "company" : mode === "find" ? "product" : "category";

      try {
        const res = await fetch(`/api/suggest?type=${type}&q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, mode]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    switch (mode) {
      case "discover": setCompany(value); break;
      case "find": setSearchProduct(value); break;
      case "category": setCategoryName(value); break;
    }
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const value = suggestion.domain || suggestion.name;
    switch (mode) {
      case "discover": setCompany(value); break;
      case "find": setSearchProduct(suggestion.name); break;
      case "category": setCategoryName(suggestion.name); break;
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setLoading(true);
    setError(null);

    try {
      if (mode === "url") {
        const res = await fetch("/api/score/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSingleResult(data.score);
      } else if (mode === "stack") {
        const urls = stackUrls
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.startsWith("http"));
        const res = await fetch("/api/score/stack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStackResults(data.results);
        setStackSavings(data.savings);
      } else if (mode === "discover") {
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setDiscovered(data.combined);
        setCompanyInfo(data.companyInfo);
        setDiscoverScores(data.scores);
        setDiscoverSavings(data.savings);
      } else if (mode === "find") {
        const res = await fetch("/api/find", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: searchProduct }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setFoundCompanies(data.companies);
        setFindNotes(data.notes);
      } else if (mode === "category") {
        const res = await fetch("/api/category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: categoryName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCategoryProducts(data.products);
        setCategoryAlternatives(data.emerging_ai_alternatives);
        setCategoryInfo({
          market_size_estimate: data.market_size_estimate,
          ai_disruption_stage: data.ai_disruption_stage,
          disruption_timeline: data.disruption_timeline,
          procurement_advice: data.procurement_advice,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const resetResults = () => {
    setSingleResult(null);
    setStackResults(null);
    setStackSavings(null);
    setDiscovered(null);
    setCompanyInfo(null);
    setDiscoverScores(null);
    setDiscoverSavings(null);
    setFoundCompanies(null);
    setFindNotes(null);
    setCategoryProducts(null);
    setCategoryAlternatives(null);
    setCategoryInfo(null);
    setError(null);
    setSuggestions([]);
  };

  const hasResults = singleResult || stackResults || discovered || foundCompanies || categoryProducts;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">SaaS AI Vulnerability Scanner</h1>
          <p className="mt-3 text-lg text-zinc-400">
            Discover, analyze, and score SaaS products for AI replacement risk
          </p>
        </header>

        {/* Mode Tabs */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {(
            [
              { id: "discover", label: "Full Discovery", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
              { id: "url", label: "Score URL", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" },
              { id: "stack", label: "Score Stack", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
              { id: "find", label: "Find Users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
              { id: "category", label: "Category Analysis", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            ] as { id: Mode; label: string; icon: string }[]
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                resetResults();
              }}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-colors ${
                mode === m.id
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} />
              </svg>
              {m.label}
            </button>
          ))}
        </div>

        {/* Input Forms */}
        <form onSubmit={handleSubmit} className="mb-8">
          {mode === "url" && (
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.zendesk.com"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? "Scoring..." : "Score"}
              </button>
            </div>
          )}

          {mode === "stack" && (
            <div className="space-y-3">
              <textarea
                value={stackUrls}
                onChange={(e) => setStackUrls(e.target.value)}
                placeholder="Enter URLs, one per line:&#10;https://www.zendesk.com&#10;https://www.salesforce.com"
                rows={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? "Scoring..." : "Score Stack"}
              </button>
            </div>
          )}

          {(mode === "discover" || mode === "find" || mode === "category") && (
            <div className="relative">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={getCurrentInput()}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      mode === "discover"
                        ? "Company name or domain (e.g., stripe.com)"
                        : mode === "find"
                        ? "SaaS product name (e.g., Salesforce)"
                        : "SaaS category (e.g., Customer Support)"
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                    required
                    autoComplete="off"
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
                    >
                      <div className="p-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {getCurrentInput() ? "Suggestions" : "Popular"}
                      </div>
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestionClick(s)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                            selectedIndex === i
                              ? "bg-zinc-800"
                              : "hover:bg-zinc-800"
                          }`}
                        >
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-sm text-zinc-500">
                              {s.domain && s.domain}
                              {s.category && s.category}
                              {s.examples && s.examples}
                            </div>
                          </div>
                          <div className="text-right text-sm text-zinc-500">
                            {s.industry && <span className="rounded-full bg-zinc-800 px-2 py-0.5">{s.industry}</span>}
                            {s.users && <span>{s.users} users</span>}
                            {s.products && <span>{s.products} products</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading
                    ? mode === "discover"
                      ? "Discovering..."
                      : mode === "find"
                      ? "Searching..."
                      : "Analyzing..."
                    : mode === "discover"
                    ? "Discover"
                    : mode === "find"
                    ? "Find"
                    : "Analyze"}
                </button>
              </div>

              <p className="mt-2 text-sm text-zinc-500">
                {mode === "discover" && "Scans website + infers stack from job postings, LinkedIn, G2"}
                {mode === "find" && "Find companies using a specific SaaS product"}
                {mode === "category" && "Analyze entire SaaS category for AI vulnerability"}
              </p>
            </div>
          )}
        </form>

        {/* Quick Suggestions (when no results yet) */}
        {!hasResults && !loading && (mode === "discover" || mode === "find" || mode === "category") && (
          <div className="mb-8">
            <p className="mb-3 text-sm text-zinc-500">Quick start:</p>
            <div className="flex flex-wrap gap-2">
              {mode === "discover" && (
                <>
                  {["stripe.com", "shopify.com", "notion.so", "figma.com", "datadog.com"].map((d) => (
                    <button
                      key={d}
                      onClick={() => { setCompany(d); setShowSuggestions(false); }}
                      className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      {d}
                    </button>
                  ))}
                </>
              )}
              {mode === "find" && (
                <>
                  {["Salesforce", "Slack", "Zendesk", "Jira", "HubSpot"].map((p) => (
                    <button
                      key={p}
                      onClick={() => { setSearchProduct(p); setShowSuggestions(false); }}
                      className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      {p}
                    </button>
                  ))}
                </>
              )}
              {mode === "category" && (
                <>
                  {["Customer Support", "CRM", "Analytics", "HR & Recruiting", "DevOps"].map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCategoryName(c); setShowSuggestions(false); }}
                      className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      {c}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-emerald-500" />
            <p className="mt-4 text-zinc-400">
              {mode === "discover" && "Scanning website & inferring stack..."}
              {mode === "find" && "Searching for companies..."}
              {mode === "category" && "Analyzing category..."}
              {(mode === "url" || mode === "stack") && "Scoring..."}
            </p>
          </div>
        )}

        {/* Results */}
        {singleResult && <ScoreCard score={singleResult} />}
        {stackResults && stackSavings && <StackReport results={stackResults} savings={stackSavings} />}
        {discovered && (
          <DiscoveryReport
            companyInfo={companyInfo}
            discovered={discovered}
            scores={discoverScores}
            savings={discoverSavings}
          />
        )}
        {foundCompanies && <FindReport companies={foundCompanies} notes={findNotes} />}
        {categoryProducts && categoryInfo && (
          <CategoryReport
            info={categoryInfo}
            products={categoryProducts}
            alternatives={categoryAlternatives}
          />
        )}
      </div>
    </div>
  );
}

// Components remain the same...
function ScoreBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 7) return "bg-red-500";
    if (s >= 4) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-3 w-48 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full ${getColor(score)} transition-all`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xl font-bold">{score}/10</span>
    </div>
  );
}

function ScoreCard({ score }: { score: VulnerabilityScore }) {
  const [showDetails, setShowDetails] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ai_native": return "bg-purple-900 text-purple-300";
      case "open_source": return "bg-emerald-900 text-emerald-300";
      case "cheaper_saas": return "bg-blue-900 text-blue-300";
      case "build_internal": return "bg-yellow-900 text-yellow-300";
      default: return "bg-zinc-700 text-zinc-300";
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "text-emerald-400";
      case "medium": return "text-yellow-400";
      case "hard": return "text-red-400";
      default: return "text-zinc-400";
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "low": return "bg-emerald-900 text-emerald-300";
      case "medium": return "bg-yellow-900 text-yellow-300";
      case "high": return "bg-red-900 text-red-300";
      default: return "bg-zinc-700 text-zinc-300";
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{score.product_name}</h2>
            <p className="mt-1 text-zinc-400">{score.core_function}</p>
          </div>
          <ScoreBar score={score.vulnerability_score} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Timeline</h3>
            <p className="text-lg">{score.replacement_timeline}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Est. Annual Cost</h3>
            <p className="text-lg">{score.estimated_annual_cost ? `$${score.estimated_annual_cost.toLocaleString()}` : "Unknown"}</p>
          </div>
        </div>

        {/* Negotiation Script - Always visible */}
        {score.negotiation_script && (
          <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Negotiation Script
            </h3>
            <p className="text-zinc-300">&ldquo;{score.negotiation_script}&rdquo;</p>
          </div>
        )}

        {/* Toggle for detailed view */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          {showDetails ? "Hide Details" : "Show Alternatives & Escape Plan"}
          <svg className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="border-t border-zinc-800 p-6 space-y-6">
          {/* Alternatives */}
          {score.alternatives && score.alternatives.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Alternatives
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {score.alternatives.map((alt, i) => (
                  <div key={i} className="rounded-lg bg-zinc-800 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium">{alt.name}</span>
                        {alt.url && (
                          <a href={alt.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-emerald-400 hover:underline">
                            Visit
                          </a>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getTypeColor(alt.type)}`}>
                        {alt.type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{alt.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="text-emerald-400">Save {alt.estimated_savings}</span>
                      <span className={getDifficultyColor(alt.migration_difficulty)}>
                        {alt.migration_difficulty} migration
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor Lock-in */}
          {score.vendor_lock_in && score.vendor_lock_in.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Vendor Lock-in & How to Escape
              </h3>
              <div className="space-y-3">
                {score.vendor_lock_in.map((lock, i) => (
                  <div key={i} className="rounded-lg bg-zinc-800 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{lock.lock_in_type}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getSeverityColor(lock.severity)}`}>
                        {lock.severity} severity
                      </span>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <div>
                        <p className="text-sm text-zinc-300">{lock.escape_tactic}</p>
                        <p className="mt-1 text-xs text-zinc-500">Timeline: {lock.timeline}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Escape Plan */}
          {score.escape_plan && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                6-Month Escape Plan
              </h3>
              <div className="rounded-lg bg-zinc-800 p-4">
                <p className="whitespace-pre-line text-sm text-zinc-300">{score.escape_plan}</p>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">How It Gets Replaced</h3>
              <p className="text-sm text-zinc-300">{score.replacement_mechanism}</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Also at Risk</h3>
              <div className="flex flex-wrap gap-2">
                {score.comparable_at_risk.map((c, i) => (
                  <span key={i} className="rounded-full bg-zinc-800 px-3 py-1 text-xs">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StackReport({ results, savings }: { results: ScoredProduct[]; savings: Savings }) {
  const successful = results.filter((r) => r.success && r.score);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Stack Summary</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <p className="text-3xl font-bold">{results.length}</p>
            <p className="text-sm text-zinc-400">Products</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{successful.filter((r) => (r.score?.vulnerability_score ?? 0) >= 7).length}</p>
            <p className="text-sm text-zinc-400">High Risk</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <p className="text-3xl font-bold">${savings.totalEstimatedCost.toLocaleString()}</p>
            <p className="text-sm text-zinc-400">Negotiable</p>
          </div>
          <div className="rounded-lg bg-emerald-900 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">${savings.potentialSavings.toLocaleString()}</p>
            <p className="text-sm text-zinc-400">Savings</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {successful.map((r, i) => <ScoreCard key={i} score={r.score!} />)}
      </div>
    </div>
  );
}

function DiscoveryReport({ companyInfo, discovered, scores, savings }: { companyInfo: CompanyInfo | null; discovered: DiscoveredProduct[]; scores: ScoredProduct[] | null; savings: Savings | null }) {
  const byCategory: Record<string, DiscoveredProduct[]> = {};
  for (const p of discovered) {
    const cat = p.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  }

  return (
    <div className="space-y-6">
      {companyInfo && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-bold">{companyInfo.name}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-sm text-zinc-500">Industry</p><p className="font-medium">{companyInfo.industry}</p></div>
            <div><p className="text-sm text-zinc-500">Size</p><p className="font-medium capitalize">{companyInfo.size_estimate}</p></div>
            <div><p className="text-sm text-zinc-500">Tech Sophistication</p><p className="font-medium capitalize">{companyInfo.tech_sophistication}</p></div>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Discovered Stack ({discovered.length} products)</h2>
        <div className="space-y-6">
          {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, products]) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{category}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p, i) => (
                  <div key={i} className="rounded-lg bg-zinc-800 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${p.confidence === "high" ? "bg-emerald-900 text-emerald-300" : p.confidence === "medium" ? "bg-yellow-900 text-yellow-300" : "bg-zinc-700 text-zinc-400"}`}>{p.confidence}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">via {p.sources.slice(0, 2).join(", ")}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {scores && scores.length > 0 && savings && <StackReport results={scores} savings={savings} />}
    </div>
  );
}

function FindReport({ companies, notes }: { companies: FoundCompany[]; notes: string | null }) {
  const bySize: Record<string, FoundCompany[]> = {};
  for (const c of companies) {
    const size = c.size || "unknown";
    if (!bySize[size]) bySize[size] = [];
    bySize[size].push(c);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-2 text-xl font-bold">Found {companies.length} Companies</h2>
        {notes && <p className="text-zinc-400">{notes}</p>}
      </div>
      {["enterprise", "midmarket", "smb", "startup", "unknown"].map((size) =>
        bySize[size] && bySize[size].length > 0 && (
          <div key={size} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="mb-4 text-lg font-semibold capitalize">{size}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bySize[size].map((c, i) => (
                <div key={i} className="rounded-lg bg-zinc-800 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.confidence === "high" ? "bg-emerald-900 text-emerald-300" : c.confidence === "medium" ? "bg-yellow-900 text-yellow-300" : "bg-zinc-700 text-zinc-400"}`}>{c.confidence}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{c.industry}</p>
                  {c.domain && <p className="text-xs text-zinc-500">{c.domain}</p>}
                  <p className="mt-2 text-xs text-zinc-500">Source: {c.source}</p>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function CategoryReport({ info, products, alternatives }: { info: { market_size_estimate: string; ai_disruption_stage: string; disruption_timeline: string; procurement_advice: string }; products: CategoryProduct[]; alternatives: AIAlternative[] | null }) {
  const sorted = [...products].sort((a, b) => b.vulnerability_estimate - a.vulnerability_estimate);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Category Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-sm text-zinc-500">Market Size</p><p className="font-medium">{info.market_size_estimate}</p></div>
          <div><p className="text-sm text-zinc-500">AI Disruption Stage</p><p className="font-medium capitalize">{info.ai_disruption_stage}</p></div>
          <div><p className="text-sm text-zinc-500">Timeline</p><p className="font-medium">{info.disruption_timeline}</p></div>
        </div>
        <div className="mt-6"><p className="text-sm text-zinc-500">Procurement Advice</p><p className="mt-1 text-zinc-300">{info.procurement_advice}</p></div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Products by Vulnerability</h2>
        <div className="space-y-4">
          {sorted.map((p, i) => (
            <div key={i} className="rounded-lg bg-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs capitalize">{p.market_position}</span>
                </div>
                <ScoreBar score={p.vulnerability_estimate} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><span className="text-red-400">Vulnerable:</span> <span className="text-zinc-400">{p.key_vulnerability}</span></div>
                <div><span className="text-emerald-400">Protected:</span> <span className="text-zinc-400">{p.key_moat}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {alternatives && alternatives.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-bold">Emerging AI Alternatives</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {alternatives.map((alt, i) => (
              <div key={i} className="rounded-lg bg-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{alt.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${alt.threat_level === "high" ? "bg-red-900 text-red-300" : alt.threat_level === "medium" ? "bg-yellow-900 text-yellow-300" : "bg-zinc-700 text-zinc-400"}`}>{alt.threat_level} threat</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{alt.description}</p>
                {alt.url && <a href={alt.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-emerald-400 hover:underline">{alt.url}</a>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
