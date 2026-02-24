import Anthropic from "@anthropic-ai/sdk";
import { ProductData } from "./scraper";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

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
}

export async function scoreProduct(productData: ProductData): Promise<VulnerabilityScore> {
  const prompt = `You are an analyst scoring SaaS products on their vulnerability to AI replacement.

Product URL: ${productData.url}
Title: ${productData.title}
Description: ${productData.metaDesc}
Headlines: ${productData.h1s} | ${productData.h2s}
Page content (excerpt): ${productData.bodyText}

Analyze this product and return ONLY valid JSON in this exact format:
{
  "product_name": "string",
  "core_function": "one sentence description of what this product does",
  "vulnerability_score": <integer 1-10, where 10 = trivially replaceable by AI today>,
  "replacement_timeline": "string, e.g. '6-18 months' or 'already happening'",
  "replacement_mechanism": "string, how specifically an AI agent or custom build replaces this",
  "moat_factors": ["array", "of", "things", "that", "slow", "replacement"],
  "negotiation_leverage": "string, what a procurement team can say to get a discount based on AI threat",
  "comparable_at_risk": ["other SaaS products in same category also at risk"],
  "estimated_annual_cost": <integer, rough estimate of annual cost in USD for mid-market company, or null if unknown>
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
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
