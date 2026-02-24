"use client";

import { useState } from "react";

type Mode = "url" | "stack" | "discover" | "find" | "category";

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

export default function Home() {
  const [mode, setMode] = useState<Mode>("discover");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single URL state
  const [url, setUrl] = useState("");
  const [singleResult, setSingleResult] = useState<VulnerabilityScore | null>(null);

  // Stack state
  const [stackUrls, setStackUrls] = useState("");
  const [stackResults, setStackResults] = useState<ScoredProduct[] | null>(null);
  const [stackSavings, setStackSavings] = useState<Savings | null>(null);

  // Discover state
  const [company, setCompany] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredProduct[] | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [discoverScores, setDiscoverScores] = useState<ScoredProduct[] | null>(null);
  const [discoverSavings, setDiscoverSavings] = useState<Savings | null>(null);

  // Find state
  const [searchProduct, setSearchProduct] = useState("");
  const [foundCompanies, setFoundCompanies] = useState<FoundCompany[] | null>(null);
  const [findNotes, setFindNotes] = useState<string | null>(null);

  // Category state
  const [categoryName, setCategoryName] = useState("");
  const [categoryProducts, setCategoryProducts] = useState<CategoryProduct[] | null>(null);
  const [categoryAlternatives, setCategoryAlternatives] = useState<AIAlternative[] | null>(null);
  const [categoryInfo, setCategoryInfo] = useState<{
    market_size_estimate: string;
    ai_disruption_stage: string;
    disruption_timeline: string;
    procurement_advice: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

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
              { id: "discover", label: "Full Discovery" },
              { id: "url", label: "Score URL" },
              { id: "stack", label: "Score Stack" },
              { id: "find", label: "Find Users" },
              { id: "category", label: "Category Analysis" },
            ] as { id: Mode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                resetResults();
              }}
              className={`rounded-lg px-5 py-2.5 font-medium transition-colors ${
                mode === m.id
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
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

          {mode === "discover" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name or domain (e.g., stripe.com)"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? "Discovering..." : "Discover & Score"}
                </button>
              </div>
              <p className="text-sm text-zinc-500">
                Scans website for SaaS fingerprints + infers stack from job postings, LinkedIn, G2
              </p>
            </div>
          )}

          {mode === "find" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="SaaS product name (e.g., Salesforce)"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? "Searching..." : "Find Companies"}
                </button>
              </div>
              <p className="text-sm text-zinc-500">
                Find companies using a specific SaaS product (reverse lookup)
              </p>
            </div>
          )}

          {mode === "category" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="SaaS category (e.g., Customer Support, CRM, Analytics)"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? "Analyzing..." : "Analyze Category"}
                </button>
              </div>
              <p className="text-sm text-zinc-500">
                Analyze an entire SaaS category for AI vulnerability
              </p>
            </div>
          )}
        </form>

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

        {stackResults && stackSavings && (
          <StackReport results={stackResults} savings={stackSavings} />
        )}

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

// Component implementations
function ScoreBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 7) return "bg-red-500";
    if (s >= 4) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-3 w-48 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full ${getColor(score)} transition-all`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-xl font-bold">{score}/10</span>
    </div>
  );
}

function ScoreCard({ score }: { score: VulnerabilityScore }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{score.product_name}</h2>
          <p className="mt-1 text-zinc-400">{score.core_function}</p>
        </div>
        <ScoreBar score={score.vulnerability_score} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Timeline
          </h3>
          <p className="text-lg">{score.replacement_timeline}</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Est. Annual Cost
          </h3>
          <p className="text-lg">
            {score.estimated_annual_cost
              ? `$${score.estimated_annual_cost.toLocaleString()}`
              : "Unknown"}
          </p>
        </div>

        <div className="md:col-span-2">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            How It Gets Replaced
          </h3>
          <p className="text-zinc-300">{score.replacement_mechanism}</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Moat Factors
          </h3>
          <ul className="space-y-1">
            {score.moat_factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-300">
                <span className="text-emerald-500">+</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Also at Risk
          </h3>
          <div className="flex flex-wrap gap-2">
            {score.comparable_at_risk.map((c, i) => (
              <span key={i} className="rounded-full bg-zinc-800 px-3 py-1 text-sm">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Procurement Leverage
          </h3>
          <blockquote className="rounded-lg border-l-4 border-emerald-600 bg-zinc-800 p-4 italic text-zinc-300">
            &ldquo;{score.negotiation_leverage}&rdquo;
          </blockquote>
        </div>
      </div>
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
            <p className="text-3xl font-bold text-red-400">
              {successful.filter((r) => (r.score?.vulnerability_score ?? 0) >= 7).length}
            </p>
            <p className="text-sm text-zinc-400">High Risk</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <p className="text-3xl font-bold">${savings.totalEstimatedCost.toLocaleString()}</p>
            <p className="text-sm text-zinc-400">Negotiable</p>
          </div>
          <div className="rounded-lg bg-emerald-900 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">
              ${savings.potentialSavings.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-400">Savings</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {successful.map((r, i) => (
          <ScoreCard key={i} score={r.score!} />
        ))}
      </div>
    </div>
  );
}

function DiscoveryReport({
  companyInfo,
  discovered,
  scores,
  savings,
}: {
  companyInfo: CompanyInfo | null;
  discovered: DiscoveredProduct[];
  scores: ScoredProduct[] | null;
  savings: Savings | null;
}) {
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
            <div>
              <p className="text-sm text-zinc-500">Industry</p>
              <p className="font-medium">{companyInfo.industry}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Size</p>
              <p className="font-medium capitalize">{companyInfo.size_estimate}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Tech Sophistication</p>
              <p className="font-medium capitalize">{companyInfo.tech_sophistication}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Discovered Stack ({discovered.length} products)</h2>
        <div className="space-y-6">
          {Object.entries(byCategory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, products]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {category}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p, i) => (
                    <div key={i} className="rounded-lg bg-zinc-800 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            p.confidence === "high"
                              ? "bg-emerald-900 text-emerald-300"
                              : p.confidence === "medium"
                                ? "bg-yellow-900 text-yellow-300"
                                : "bg-zinc-700 text-zinc-400"
                          }`}
                        >
                          {p.confidence}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        via {p.sources.slice(0, 2).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {scores && scores.length > 0 && savings && (
        <StackReport results={scores} savings={savings} />
      )}
    </div>
  );
}

function FindReport({
  companies,
  notes,
}: {
  companies: FoundCompany[];
  notes: string | null;
}) {
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

      {["enterprise", "midmarket", "smb", "startup", "unknown"].map(
        (size) =>
          bySize[size] &&
          bySize[size].length > 0 && (
            <div key={size} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="mb-4 text-lg font-semibold capitalize">{size}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bySize[size].map((c, i) => (
                  <div key={i} className="rounded-lg bg-zinc-800 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          c.confidence === "high"
                            ? "bg-emerald-900 text-emerald-300"
                            : c.confidence === "medium"
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {c.confidence}
                      </span>
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

function CategoryReport({
  info,
  products,
  alternatives,
}: {
  info: {
    market_size_estimate: string;
    ai_disruption_stage: string;
    disruption_timeline: string;
    procurement_advice: string;
  };
  products: CategoryProduct[];
  alternatives: AIAlternative[] | null;
}) {
  const sorted = [...products].sort((a, b) => b.vulnerability_estimate - a.vulnerability_estimate);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Category Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-zinc-500">Market Size</p>
            <p className="font-medium">{info.market_size_estimate}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">AI Disruption Stage</p>
            <p className="font-medium capitalize">{info.ai_disruption_stage}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Timeline</p>
            <p className="font-medium">{info.disruption_timeline}</p>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm text-zinc-500">Procurement Advice</p>
          <p className="mt-1 text-zinc-300">{info.procurement_advice}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Products by Vulnerability</h2>
        <div className="space-y-4">
          {sorted.map((p, i) => (
            <div key={i} className="rounded-lg bg-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs capitalize">
                    {p.market_position}
                  </span>
                </div>
                <ScoreBar score={p.vulnerability_estimate} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-red-400">Vulnerable:</span>{" "}
                  <span className="text-zinc-400">{p.key_vulnerability}</span>
                </div>
                <div>
                  <span className="text-emerald-400">Protected:</span>{" "}
                  <span className="text-zinc-400">{p.key_moat}</span>
                </div>
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
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      alt.threat_level === "high"
                        ? "bg-red-900 text-red-300"
                        : alt.threat_level === "medium"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {alt.threat_level} threat
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{alt.description}</p>
                {alt.url && (
                  <a
                    href={alt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-xs text-emerald-400 hover:underline"
                  >
                    {alt.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
