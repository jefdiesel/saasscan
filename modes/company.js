/**
 * Company scan mode - infer SaaS stack from web signals and score
 */

import Anthropic from "@anthropic-ai/sdk";
import { scrapePage, scrapePages } from "../lib/scraper.js";
import { scoreProducts, calculateSavings } from "../lib/scorer.js";
import { printCompanyReport, generateJsonReport, generateMarkdownReport } from "../lib/report.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

/**
 * Use Claude with web search to infer a company's SaaS stack
 */
async function inferSaasStack(companyName) {
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

  const text = response.content[0].text;
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function runCompany(companyName, options = {}) {
  const { json = false, markdown = false, output = null, quiet = false } = options;

  if (!quiet) {
    console.log(`\nResearching SaaS stack for "${companyName}"...`);
  }

  // Infer the stack using web search
  const stackInfo = await inferSaasStack(companyName);

  if (!stackInfo.inferred_stack || stackInfo.inferred_stack.length === 0) {
    throw new Error(`Could not infer any SaaS products for "${companyName}"`);
  }

  const inferredStack = stackInfo.inferred_stack;

  if (!quiet) {
    console.log(`Found ${inferredStack.length} likely products\n`);
  }

  // Extract URLs and scrape
  const urls = inferredStack
    .filter(p => p.url && p.url.startsWith("http"))
    .map(p => p.url);

  if (urls.length === 0) {
    throw new Error("No valid product URLs found in inferred stack");
  }

  if (!quiet) {
    console.log("Scraping product pages...");
  }

  const scrapeResults = await scrapePages(urls);
  const successfulScrapes = scrapeResults.filter(r => r.success);

  if (!quiet) {
    console.log(`Scraped ${successfulScrapes.length}/${urls.length} pages\n`);
    console.log("Scoring with AI...");
  }

  // Score products
  const productDataList = successfulScrapes.map(r => r.data);
  const scoreResults = await scoreProducts(productDataList);

  // Merge failures
  const allResults = [
    ...scoreResults,
    ...scrapeResults.filter(r => !r.success).map(r => ({
      success: false,
      url: r.url,
      error: `Scrape failed: ${r.error}`
    }))
  ];

  const savings = calculateSavings(allResults);

  // Output
  const metadata = {
    mode: "company",
    company: companyName,
    stack_notes: stackInfo.notes,
    inferred_stack: inferredStack
  };

  if (json) {
    const report = generateJsonReport(allResults, savings, metadata);
    const jsonOutput = JSON.stringify(report, null, 2);

    if (output) {
      const { writeFileSync } = await import("fs");
      writeFileSync(output, jsonOutput);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(jsonOutput);
    }
  } else if (markdown) {
    const md = generateMarkdownReport(allResults, savings, metadata);

    if (output) {
      const { writeFileSync } = await import("fs");
      writeFileSync(output, md);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(md);
    }
  } else {
    printCompanyReport(companyName, inferredStack, allResults, savings);
  }

  return { inferredStack, results: allResults, savings };
}
