#!/usr/bin/env node

/**
 * SaaS AI Vulnerability Scorer
 * 
 * Usage: node scorer.js <product-url>
 * Example: node scorer.js https://www.zendesk.com
 * 
 * Install deps: npm install @anthropic-ai/sdk cheerio node-fetch
 */

import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import fetch from "node-fetch";

const client = new Anthropic();

// --- Scrape product page ---
async function scrapePage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SaaSScorer/1.0)" },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Pull meaningful text, strip nav/footer noise
  $("nav, footer, script, style, noscript").remove();

  const title = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().join(" | ");
  const h2s = $("h2").map((_, el) => $(el).text().trim()).get().slice(0, 10).join(" | ");
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

  return { url, title, metaDesc, h1s, h2s, bodyText };
}

// --- Score with Claude ---
async function scoreVulnerability(productData) {
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
  "comparable_at_risk": ["other SaaS products in same category also at risk"]
}`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text;
  
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

// --- Pretty print results ---
function printReport(score) {
  const bar = "█".repeat(score.vulnerability_score) + "░".repeat(10 - score.vulnerability_score);
  
  console.log("\n" + "=".repeat(60));
  console.log(`  ${score.product_name}`);
  console.log("=".repeat(60));
  console.log(`\n  Core function: ${score.core_function}`);
  console.log(`\n  AI Vulnerability: [${bar}] ${score.vulnerability_score}/10`);
  console.log(`  Timeline: ${score.replacement_timeline}`);
  console.log(`\n  How it gets replaced:\n  ${score.replacement_mechanism}`);
  console.log(`\n  What protects it:`);
  score.moat_factors.forEach(f => console.log(`    • ${f}`));
  console.log(`\n  💬 Procurement leverage:\n  "${score.negotiation_leverage}"`);
  console.log(`\n  Also at risk: ${score.comparable_at_risk.join(", ")}`);
  console.log("\n" + "=".repeat(60) + "\n");
}

// --- Main ---
const url = process.argv[2];

if (!url) {
  console.error("Usage: node scorer.js <product-url>");
  console.error("Example: node scorer.js https://www.zendesk.com");
  process.exit(1);
}

console.log(`\nScoring ${url}...`);

try {
  const productData = await scrapePage(url);
  const score = await scoreVulnerability(productData);
  printReport(score);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
