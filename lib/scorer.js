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
