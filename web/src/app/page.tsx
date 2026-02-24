"use client";

import { useState } from "react";

type Mode = "url" | "stack" | "company";

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

interface InferredProduct {
  name: string;
  category: string;
  url: string;
  confidence: string;
  source: string;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("url");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single URL state
  const [url, setUrl] = useState("");
  const [singleResult, setSingleResult] = useState<VulnerabilityScore | null>(null);

  // Stack state
  const [stackUrls, setStackUrls] = useState("");
  const [stackResults, setStackResults] = useState<ScoredProduct[] | null>(null);
  const [stackSavings, setStackSavings] = useState<Savings | null>(null);

  // Company state
  const [company, setCompany] = useState("");
  const [companyResults, setCompanyResults] = useState<ScoredProduct[] | null>(null);
  const [companySavings, setCompanySavings] = useState<Savings | null>(null);
  const [inferredStack, setInferredStack] = useState<InferredProduct[] | null>(null);

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
      } else if (mode === "company") {
        const res = await fetch("/api/score/company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCompanyResults(data.results);
        setCompanySavings(data.savings);
        setInferredStack(data.inferredStack);
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
    setCompanyResults(null);
    setCompanySavings(null);
    setInferredStack(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">SaaS AI Vulnerability Scorer</h1>
          <p className="mt-3 text-lg text-zinc-400">
            Score SaaS products on their vulnerability to AI replacement
          </p>
        </header>

        {/* Mode Tabs */}
        <div className="mb-8 flex justify-center gap-2">
          {(["url", "stack", "company"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                resetResults();
              }}
              className={`rounded-lg px-6 py-2.5 font-medium transition-colors ${
                mode === m
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {m === "url" && "Single URL"}
              {m === "stack" && "Stack Scan"}
              {m === "company" && "Company Scan"}
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
                placeholder="Enter URLs, one per line:&#10;https://www.zendesk.com&#10;https://www.salesforce.com&#10;https://www.intercom.com"
                rows={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? "Scoring Stack..." : "Score Stack"}
              </button>
            </div>
          )}

          {mode === "company" && (
            <div className="flex gap-3">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name (e.g., Stripe, Airbnb)"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? "Scanning..." : "Scan Company"}
              </button>
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
              {mode === "company" ? "Inferring stack and scoring..." : "Analyzing..."}
            </p>
          </div>
        )}

        {/* Single Result */}
        {singleResult && <ScoreCard score={singleResult} />}

        {/* Stack Results */}
        {stackResults && stackSavings && (
          <StackReport results={stackResults} savings={stackSavings} />
        )}

        {/* Company Results */}
        {companyResults && companySavings && inferredStack && (
          <CompanyReport
            company={company}
            inferredStack={inferredStack}
            results={companyResults}
            savings={companySavings}
          />
        )}
      </div>
    </div>
  );
}

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
      {/* Summary */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Stack Summary</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <p className="text-3xl font-bold">{results.length}</p>
            <p className="text-sm text-zinc-400">Products Scanned</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <p className="text-3xl font-bold text-red-400">
              {successful.filter((r) => (r.score?.vulnerability_score ?? 0) >= 7).length}
            </p>
            <p className="text-sm text-zinc-400">High Risk (7+)</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 text-center">
            <p className="text-3xl font-bold">${savings.totalEstimatedCost.toLocaleString()}</p>
            <p className="text-sm text-zinc-400">Negotiable Spend</p>
          </div>
          <div className="rounded-lg bg-emerald-900 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">
              ${savings.potentialSavings.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-400">Potential Savings</p>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {successful.map((r, i) => (
          <ScoreCard key={i} score={r.score!} />
        ))}
      </div>

      {/* Errors */}
      {results.filter((r) => !r.success).length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="mb-3 font-semibold text-red-400">Failed to Score</h3>
          <ul className="space-y-1 text-sm text-zinc-400">
            {results
              .filter((r) => !r.success)
              .map((r, i) => (
                <li key={i}>
                  {r.url}: {r.error}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CompanyReport({
  company,
  inferredStack,
  results,
  savings,
}: {
  company: string;
  inferredStack: InferredProduct[];
  results: ScoredProduct[];
  savings: Savings;
}) {
  return (
    <div className="space-y-6">
      {/* Inferred Stack */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-xl font-bold">Inferred Stack for {company}</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {inferredStack.map((p, i) => (
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
              <p className="text-sm text-zinc-400">{p.category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Use existing StackReport for results */}
      <StackReport results={results} savings={savings} />
    </div>
  );
}
