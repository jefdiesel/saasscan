import Anthropic from "@anthropic-ai/sdk";
import { ProductData } from "./scraper";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

export interface Alternative {
  name: string;
  type: "ai_native" | "open_source" | "cheaper_saas" | "build_internal";
  url?: string;
  estimated_savings: string;
  migration_difficulty: "easy" | "medium" | "hard";
  description: string;
}

export interface LockInStrategy {
  lock_in_type: string;
  severity: "low" | "medium" | "high";
  escape_tactic: string;
  timeline: string;
}

export interface VulnerabilityScore {
  product_name: string;
  core_function: string;
  vulnerability_score: number;
  replacement_timeline: string;
  replacement_mechanism: string;
  moat_factors: string[];
  negotiation_leverage: string;
  comparable_at_risk: string[];
  estimated_annual_cost: number | null;
  // New fields
  alternatives: Alternative[];
  vendor_lock_in: LockInStrategy[];
  escape_plan: string;
  negotiation_script: string;
}

export async function scoreProduct(productData: ProductData): Promise<VulnerabilityScore> {
  const prompt = `You are an analyst helping procurement teams reduce SaaS costs and vendor dependency.

Product URL: ${productData.url}
Title: ${productData.title}
Description: ${productData.metaDesc}
Headlines: ${productData.h1s} | ${productData.h2s}
Page content (excerpt): ${productData.bodyText}

Analyze this product and return ONLY valid JSON:
{
  "product_name": "string",
  "core_function": "one sentence description",
  "vulnerability_score": <1-10, where 10 = trivially replaceable by AI today>,
  "replacement_timeline": "e.g. '6-18 months' or 'already happening'",
  "replacement_mechanism": "how AI/automation replaces this specifically",
  "moat_factors": ["what protects this vendor"],
  "negotiation_leverage": "one-liner for procurement to use",
  "comparable_at_risk": ["similar products also at risk"],
  "estimated_annual_cost": <integer USD for mid-market, or null>,

  "alternatives": [
    {
      "name": "Alternative name",
      "type": "ai_native|open_source|cheaper_saas|build_internal",
      "url": "https://alternative.com",
      "estimated_savings": "40-60%",
      "migration_difficulty": "easy|medium|hard",
      "description": "why this is a viable alternative"
    }
  ],

  "vendor_lock_in": [
    {
      "lock_in_type": "e.g. Data format, API dependencies, Workflow integrations",
      "severity": "low|medium|high",
      "escape_tactic": "specific action to reduce this lock-in",
      "timeline": "how long to implement the escape"
    }
  ],

  "escape_plan": "step-by-step plan to migrate away from this vendor within 6 months",

  "negotiation_script": "2-3 sentence script a procurement manager can use in renewal negotiations, citing AI alternatives and migration readiness"
}

Provide 3-5 alternatives (prioritize AI-native and open source).
Identify 2-4 vendor lock-in factors with specific escape tactics.
The escape plan should be actionable and specific.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

export interface InferredProduct {
  name: string;
  category: string;
  url: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface InferredStack {
  company: string;
  inferred_stack: InferredProduct[];
  notes: string;
}

export async function inferSaasStack(companyName: string): Promise<InferredStack> {
  const prompt = `You are researching the SaaS tools used by "${companyName}".

Search for information about this company's tech stack from:
1. Job postings mentioning specific tools
2. LinkedIn profiles of employees mentioning tools they use
3. G2 reviews or case studies
4. Tech stack disclosure sites like StackShare, BuiltWith, or Wappalyzer
5. Company blog posts or engineering blogs

Return ONLY valid JSON with the following structure:
{
  "company": "${companyName}",
  "inferred_stack": [
    {
      "name": "Product Name",
      "category": "e.g. CRM, Support, Analytics, HR, etc.",
      "url": "https://product-homepage.com",
      "confidence": "high|medium|low",
      "source": "brief note on where this was found"
    }
  ],
  "notes": "any relevant context about the company's tech sophistication"
}

Focus on SaaS products that would have meaningful annual contracts (skip free tools, browser extensions, etc). Include 5-15 products if possible.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}
