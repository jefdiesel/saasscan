/**
 * AI vulnerability scoring using Claude
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

/**
 * Score a single product's AI vulnerability
 */
export async function scoreProduct(productData) {
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

  "escape_plan": "step-by-step plan to migrate away within 6 months",
  "negotiation_script": "2-3 sentence script for renewal negotiations"
}

Provide 3-5 alternatives (prioritize AI-native and open source).
Identify 2-4 vendor lock-in factors with specific escape tactics.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text;
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Score multiple products concurrently
 */
export async function scoreProducts(productDataList, { concurrency = 2 } = {}) {
  const results = [];

  for (let i = 0; i < productDataList.length; i += concurrency) {
    const batch = productDataList.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(data => scoreProduct(data))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const url = batch[j].url;
      if (result.status === "fulfilled") {
        results.push({ success: true, url, score: result.value });
      } else {
        results.push({ success: false, url, error: result.reason.message });
      }
    }
  }

  return results;
}

/**
 * Calculate potential savings from negotiation leverage
 */
export function calculateSavings(scores, discountPercent = 15) {
  let totalEstimatedCost = 0;
  let negotiableProducts = 0;

  for (const result of scores) {
    if (!result.success) continue;
    const { score } = result;

    // Products with vulnerability >= 6 have strong negotiation leverage
    if (score.vulnerability_score >= 6 && score.estimated_annual_cost) {
      totalEstimatedCost += score.estimated_annual_cost;
      negotiableProducts++;
    }
  }

  return {
    totalEstimatedCost,
    negotiableProducts,
    potentialSavings: Math.round(totalEstimatedCost * (discountPercent / 100)),
    discountPercent,
  };
}
