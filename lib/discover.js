/**
 * Comprehensive SaaS discovery - combines multiple detection methods
 */

import Anthropic from "@anthropic-ai/sdk";
import { detectFromWebsite, getProductCategory, PRODUCT_URLS } from "./detect.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

/**
 * Full discovery for a company - website detection + AI inference
 */
export async function discoverCompanyStack(companyNameOrDomain, options = {}) {
  const { includeWebDetection = true, verbose = false } = options;

  const results = {
    company: companyNameOrDomain,
    detected: [],      // From website fingerprinting
    inferred: [],      // From AI analysis of job postings, etc.
    combined: [],      // Merged and deduplicated
    metadata: {},
  };

  // Step 1: Website detection if we have a domain
  if (includeWebDetection) {
    const domain = extractDomain(companyNameOrDomain);
    if (domain) {
      if (verbose) console.log(`  Scanning ${domain} for SaaS fingerprints...`);
      const detected = await detectFromWebsite(domain);
      results.detected = detected.map(d => ({
        ...d,
        category: getProductCategory(d.name),
      }));
      if (verbose) console.log(`  Found ${detected.length} tools via website detection`);
    }
  }

  // Step 2: AI-powered inference from multiple sources
  if (verbose) console.log(`  Inferring stack from job postings, LinkedIn, G2...`);
  const inferred = await inferStackFromSources(companyNameOrDomain);
  results.inferred = inferred.products;
  results.metadata = {
    company_info: inferred.company_info,
    sources_checked: inferred.sources_checked,
  };

  // Step 3: Combine and deduplicate
  results.combined = combineResults(results.detected, results.inferred);

  return results;
}

/**
 * AI-powered stack inference from multiple data sources
 */
async function inferStackFromSources(companyName) {
  const prompt = `You are a technology analyst researching the software stack used by "${companyName}".

Search comprehensively across these sources:

1. **Job Postings** - Look for their careers page and job boards (LinkedIn Jobs, Indeed, Greenhouse, Lever). Tools mentioned in job requirements are highly reliable signals.

2. **LinkedIn** - Check employee profiles, especially:
   - Engineering/IT staff listing tools in their skills
   - Posts mentioning tools they use
   - Company page tech stack mentions

3. **G2/Capterra Reviews** - Search for reviews where this company is mentioned as a customer, or case studies featuring them.

4. **StackShare/BuiltWith** - Check if they have a public stack profile.

5. **Tech Blog/Engineering Blog** - Many companies blog about their stack choices.

6. **Press Releases/Case Studies** - SaaS vendors often publish customer wins.

7. **GitHub/Open Source** - Check if they have public repos that reveal dependencies.

Return ONLY valid JSON:
{
  "company_info": {
    "name": "Official company name",
    "industry": "Their industry",
    "size_estimate": "startup/smb/midmarket/enterprise",
    "tech_sophistication": "low/medium/high"
  },
  "sources_checked": ["list of sources you found data from"],
  "products": [
    {
      "name": "Product Name",
      "category": "CRM/Analytics/Support/HR/DevOps/etc",
      "url": "https://product-url.com",
      "confidence": "high/medium/low",
      "source": "where you found this (e.g., 'job posting for Senior Engineer', 'G2 case study')",
      "evidence": "brief quote or description of the evidence"
    }
  ]
}

Be thorough. Include 10-25 products if possible. Focus on paid SaaS with meaningful contracts. Skip free tools and browser extensions.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text;
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Combine website detection and AI inference results
 */
function combineResults(detected, inferred) {
  const combined = new Map();

  // Add detected products with high priority
  for (const product of detected) {
    combined.set(product.name.toLowerCase(), {
      name: product.name,
      category: product.category,
      url: product.url,
      confidence: product.confidence,
      sources: ["website_detection"],
      evidence: product.evidence,
    });
  }

  // Merge inferred products
  for (const product of inferred) {
    const key = product.name.toLowerCase();
    const existing = combined.get(key);

    if (existing) {
      // Boost confidence if found in both
      existing.confidence = "high";
      existing.sources.push(product.source);
      if (product.evidence) {
        existing.evidence = [...(existing.evidence || []), product.evidence];
      }
    } else {
      combined.set(key, {
        name: product.name,
        category: product.category,
        url: product.url || PRODUCT_URLS[product.name] || null,
        confidence: product.confidence,
        sources: [product.source],
        evidence: product.evidence ? [product.evidence] : [],
      });
    }
  }

  // Sort by confidence then name
  return Array.from(combined.values()).sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const diff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Bulk discovery for multiple companies
 */
export async function discoverBulk(companies, options = {}) {
  const { concurrency = 2, onProgress = null } = options;
  const results = [];

  for (let i = 0; i < companies.length; i += concurrency) {
    const batch = companies.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(company => discoverCompanyStack(company, options))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const company = batch[j];
      const result = batchResults[j];

      if (result.status === "fulfilled") {
        results.push({ success: true, company, data: result.value });
      } else {
        results.push({ success: false, company, error: result.reason.message });
      }

      if (onProgress) {
        onProgress(i + j + 1, companies.length, company);
      }
    }
  }

  return results;
}

/**
 * Reverse lookup - find companies using a specific SaaS product
 */
export async function findCompaniesUsing(productName, options = {}) {
  const { industry = null, companySize = null, limit = 25 } = options;

  let filterDesc = "";
  if (industry) filterDesc += ` in the ${industry} industry`;
  if (companySize) filterDesc += ` of ${companySize} size`;

  const prompt = `Find companies that use "${productName}"${filterDesc}.

Search for:
1. Case studies and customer stories on ${productName}'s website
2. G2 reviews mentioning company names
3. LinkedIn posts about using ${productName}
4. Press releases about ${productName} deployments
5. Job postings requiring ${productName} experience
6. StackShare profiles listing ${productName}

Return ONLY valid JSON:
{
  "product": "${productName}",
  "companies": [
    {
      "name": "Company Name",
      "industry": "Their industry",
      "size": "startup/smb/midmarket/enterprise",
      "confidence": "high/medium/low",
      "source": "where you found this",
      "domain": "company.com if known"
    }
  ],
  "total_found": <number>,
  "notes": "any relevant context about ${productName}'s market presence"
}

Return up to ${limit} companies, prioritizing well-known names and high-confidence matches.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text;
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Extract domain from company name or URL
 */
function extractDomain(input) {
  // If it's already a URL
  if (input.startsWith("http")) {
    try {
      return new URL(input).hostname;
    } catch {
      return null;
    }
  }

  // If it looks like a domain
  if (input.includes(".") && !input.includes(" ")) {
    return input.replace(/^www\./, "");
  }

  // Try common domain patterns
  const cleaned = input.toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (cleaned) {
    return `${cleaned}.com`;
  }

  return null;
}

/**
 * Get comprehensive market analysis for a SaaS category
 */
export async function analyzeCategory(category) {
  const prompt = `Analyze the "${category}" SaaS category for AI vulnerability.

Provide a comprehensive market analysis:

1. **Major Players** - List the top 10-15 products in this category
2. **AI Disruption Status** - How is AI already impacting this category?
3. **Vulnerability Assessment** - Which products are most/least vulnerable?
4. **Emerging Alternatives** - What AI-native alternatives are emerging?
5. **Timeline** - When will AI meaningfully disrupt this category?

Return ONLY valid JSON:
{
  "category": "${category}",
  "market_size_estimate": "string",
  "ai_disruption_stage": "early/growing/accelerating/mature",
  "products": [
    {
      "name": "Product Name",
      "url": "https://product.com",
      "market_position": "leader/challenger/niche",
      "vulnerability_estimate": 1-10,
      "key_vulnerability": "why it's vulnerable",
      "key_moat": "what protects it"
    }
  ],
  "emerging_ai_alternatives": [
    {
      "name": "AI Alternative",
      "url": "https://alternative.com",
      "threat_level": "high/medium/low",
      "description": "what it does"
    }
  ],
  "disruption_timeline": "string describing expected timeline",
  "procurement_advice": "what procurement teams should do about this category"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text;
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}
