/**
 * Discovery mode - find and scan SaaS stacks
 */

import { readFileSync, writeFileSync } from "fs";
import { discoverCompanyStack, discoverBulk, findCompaniesUsing, analyzeCategory } from "../lib/discover.js";
import { scrapePages } from "../lib/scraper.js";
import { scoreProducts, calculateSavings } from "../lib/scorer.js";
import { printStackReport, generateJsonReport, generateMarkdownReport } from "../lib/report.js";

/**
 * Discover a single company's stack
 */
export async function runDiscover(companyOrDomain, options = {}) {
  const { json = false, markdown = false, output = null, quiet = false, score = true } = options;

  if (!quiet) {
    console.log(`\nDiscovering SaaS stack for "${companyOrDomain}"...\n`);
  }

  const discovery = await discoverCompanyStack(companyOrDomain, { verbose: !quiet });

  if (!quiet) {
    console.log(`\nFound ${discovery.combined.length} products total`);
    console.log(`  - ${discovery.detected.length} via website detection`);
    console.log(`  - ${discovery.inferred.length} via AI inference\n`);
  }

  // Optionally score discovered products
  let scoreResults = null;
  let savings = null;

  if (score && discovery.combined.length > 0) {
    const urls = discovery.combined
      .filter(p => p.url)
      .map(p => p.url)
      .slice(0, 15); // Limit to avoid rate limits

    if (urls.length > 0 && !quiet) {
      console.log(`Scoring ${urls.length} products...\n`);
    }

    if (urls.length > 0) {
      const scrapeResults = await scrapePages(urls);
      const successful = scrapeResults.filter(r => r.success);
      scoreResults = await scoreProducts(successful.map(r => r.data));
      savings = calculateSavings(scoreResults);
    }
  }

  // Output
  const reportData = {
    company: companyOrDomain,
    discovery,
    scores: scoreResults,
    savings,
  };

  if (json) {
    const jsonOutput = JSON.stringify(reportData, null, 2);
    if (output) {
      writeFileSync(output, jsonOutput);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(jsonOutput);
    }
  } else if (markdown) {
    const md = generateDiscoveryMarkdown(reportData);
    if (output) {
      writeFileSync(output, md);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(md);
    }
  } else {
    printDiscoveryReport(reportData);
  }

  return reportData;
}

/**
 * Bulk discovery for multiple companies
 */
export async function runBulkDiscover(inputFile, options = {}) {
  const { json = false, output = null, quiet = false, score = true } = options;

  // Parse input file (CSV or line-separated)
  const content = readFileSync(inputFile, "utf-8");
  const companies = content
    .split("\n")
    .map(line => line.split(",")[0].trim())
    .filter(c => c && !c.toLowerCase().startsWith("company"));

  if (companies.length === 0) {
    throw new Error("No companies found in input file");
  }

  if (!quiet) {
    console.log(`\nBulk discovering stacks for ${companies.length} companies...\n`);
  }

  const results = await discoverBulk(companies, {
    verbose: false,
    onProgress: quiet ? null : (current, total, company) => {
      console.log(`  [${current}/${total}] ${company}`);
    },
  });

  // Aggregate stats
  const successful = results.filter(r => r.success);
  const totalProducts = successful.reduce((sum, r) => sum + r.data.combined.length, 0);

  if (!quiet) {
    console.log(`\nDiscovered ${totalProducts} products across ${successful.length} companies\n`);
  }

  // Output
  if (json) {
    const jsonOutput = JSON.stringify({ companies: results }, null, 2);
    if (output) {
      writeFileSync(output, jsonOutput);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    printBulkDiscoveryReport(results);
  }

  return results;
}

/**
 * Reverse lookup - find companies using a product
 */
export async function runReverseLookup(productName, options = {}) {
  const { json = false, output = null, quiet = false, industry = null, size = null } = options;

  if (!quiet) {
    console.log(`\nFinding companies using "${productName}"...\n`);
  }

  const result = await findCompaniesUsing(productName, { industry, companySize: size });

  if (!quiet) {
    console.log(`Found ${result.companies.length} companies\n`);
  }

  if (json) {
    const jsonOutput = JSON.stringify(result, null, 2);
    if (output) {
      writeFileSync(output, jsonOutput);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    printReverseLookupReport(result);
  }

  return result;
}

/**
 * Analyze a SaaS category
 */
export async function runCategoryAnalysis(category, options = {}) {
  const { json = false, output = null, quiet = false } = options;

  if (!quiet) {
    console.log(`\nAnalyzing "${category}" category for AI vulnerability...\n`);
  }

  const analysis = await analyzeCategory(category);

  if (json) {
    const jsonOutput = JSON.stringify(analysis, null, 2);
    if (output) {
      writeFileSync(output, jsonOutput);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    printCategoryReport(analysis);
  }

  return analysis;
}

// --- Print functions ---

function printDiscoveryReport(data) {
  const { company, discovery, scores, savings } = data;

  console.log("\n" + "=".repeat(70));
  console.log(`  SAAS STACK DISCOVERY: ${company.toUpperCase()}`);
  console.log("=".repeat(70));

  if (discovery.metadata.company_info) {
    const info = discovery.metadata.company_info;
    console.log(`\n  Industry: ${info.industry || "Unknown"}`);
    console.log(`  Size: ${info.size_estimate || "Unknown"}`);
    console.log(`  Tech Sophistication: ${info.tech_sophistication || "Unknown"}`);
  }

  // Group by category
  const byCategory = {};
  for (const product of discovery.combined) {
    const cat = product.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(product);
  }

  console.log("\n" + "-".repeat(70));
  console.log("  DISCOVERED STACK BY CATEGORY");
  console.log("-".repeat(70));

  for (const [category, products] of Object.entries(byCategory).sort()) {
    console.log(`\n  ${category}:`);
    for (const p of products) {
      const conf = p.confidence === "high" ? "[H]" : p.confidence === "medium" ? "[M]" : "[L]";
      const sources = p.sources.slice(0, 2).join(", ");
      console.log(`    ${conf} ${p.name}`);
      console.log(`        via: ${sources}`);
    }
  }

  if (scores && scores.length > 0) {
    console.log("\n" + "-".repeat(70));
    console.log("  AI VULNERABILITY SCORES");
    console.log("-".repeat(70) + "\n");

    const successful = scores.filter(r => r.success);
    for (const r of successful) {
      const s = r.score;
      const bar = "\u2588".repeat(s.vulnerability_score) + "\u2591".repeat(10 - s.vulnerability_score);
      console.log(`  [${bar}] ${s.vulnerability_score}/10  ${s.product_name}`);
      console.log(`     ${s.replacement_timeline}`);
    }

    if (savings) {
      console.log("\n" + "-".repeat(70));
      console.log("  NEGOTIATION OPPORTUNITY");
      console.log("-".repeat(70));
      console.log(`\n  High-vulnerability products: ${savings.negotiableProducts}`);
      console.log(`  Estimated negotiable spend: $${savings.totalEstimatedCost.toLocaleString()}`);
      console.log(`  Potential savings (15%): $${savings.potentialSavings.toLocaleString()}`);
    }
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

function printBulkDiscoveryReport(results) {
  console.log("\n" + "=".repeat(70));
  console.log("  BULK DISCOVERY RESULTS");
  console.log("=".repeat(70));

  // Aggregate all products across companies
  const productCounts = {};

  for (const r of results) {
    if (!r.success) continue;
    for (const product of r.data.combined) {
      const name = product.name;
      if (!productCounts[name]) {
        productCounts[name] = { name, count: 0, companies: [], category: product.category };
      }
      productCounts[name].count++;
      productCounts[name].companies.push(r.company);
    }
  }

  // Sort by frequency
  const sorted = Object.values(productCounts).sort((a, b) => b.count - a.count);

  console.log("\n  MOST COMMON PRODUCTS ACROSS COMPANIES:\n");

  for (const p of sorted.slice(0, 20)) {
    const bar = "\u2588".repeat(Math.min(p.count, 20));
    console.log(`  ${bar} ${p.count}x  ${p.name} (${p.category})`);
  }

  console.log("\n" + "-".repeat(70));
  console.log("  PER-COMPANY SUMMARY");
  console.log("-".repeat(70) + "\n");

  for (const r of results) {
    if (r.success) {
      console.log(`  ${r.company}: ${r.data.combined.length} products detected`);
    } else {
      console.log(`  ${r.company}: FAILED - ${r.error}`);
    }
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

function printReverseLookupReport(result) {
  console.log("\n" + "=".repeat(70));
  console.log(`  COMPANIES USING: ${result.product.toUpperCase()}`);
  console.log("=".repeat(70));

  console.log(`\n  Found: ${result.total_found} companies`);
  if (result.notes) {
    console.log(`  Notes: ${result.notes}`);
  }

  console.log("\n" + "-".repeat(70) + "\n");

  // Group by size
  const bySize = { enterprise: [], midmarket: [], smb: [], startup: [], unknown: [] };
  for (const c of result.companies) {
    const size = c.size || "unknown";
    bySize[size] = bySize[size] || [];
    bySize[size].push(c);
  }

  for (const [size, companies] of Object.entries(bySize)) {
    if (companies.length === 0) continue;
    console.log(`  ${size.toUpperCase()}:`);
    for (const c of companies) {
      const conf = c.confidence === "high" ? "[H]" : c.confidence === "medium" ? "[M]" : "[L]";
      console.log(`    ${conf} ${c.name} (${c.industry})`);
      if (c.domain) console.log(`        ${c.domain}`);
    }
    console.log();
  }

  console.log("=".repeat(70) + "\n");
}

function printCategoryReport(analysis) {
  console.log("\n" + "=".repeat(70));
  console.log(`  CATEGORY ANALYSIS: ${analysis.category.toUpperCase()}`);
  console.log("=".repeat(70));

  console.log(`\n  Market Size: ${analysis.market_size_estimate}`);
  console.log(`  AI Disruption Stage: ${analysis.ai_disruption_stage}`);
  console.log(`  Disruption Timeline: ${analysis.disruption_timeline}`);

  console.log("\n" + "-".repeat(70));
  console.log("  PRODUCTS BY VULNERABILITY");
  console.log("-".repeat(70) + "\n");

  const sorted = [...analysis.products].sort((a, b) => b.vulnerability_estimate - a.vulnerability_estimate);

  for (const p of sorted) {
    const bar = "\u2588".repeat(p.vulnerability_estimate) + "\u2591".repeat(10 - p.vulnerability_estimate);
    console.log(`  [${bar}] ${p.vulnerability_estimate}/10  ${p.name} (${p.market_position})`);
    console.log(`     Vulnerable: ${p.key_vulnerability}`);
    console.log(`     Protected: ${p.key_moat}`);
    console.log();
  }

  if (analysis.emerging_ai_alternatives?.length > 0) {
    console.log("-".repeat(70));
    console.log("  EMERGING AI ALTERNATIVES");
    console.log("-".repeat(70) + "\n");

    for (const alt of analysis.emerging_ai_alternatives) {
      const threat = alt.threat_level === "high" ? "[!]" : alt.threat_level === "medium" ? "[*]" : "[-]";
      console.log(`  ${threat} ${alt.name}`);
      console.log(`      ${alt.description}`);
      if (alt.url) console.log(`      ${alt.url}`);
      console.log();
    }
  }

  console.log("-".repeat(70));
  console.log("  PROCUREMENT ADVICE");
  console.log("-".repeat(70));
  console.log(`\n  ${analysis.procurement_advice}\n`);

  console.log("=".repeat(70) + "\n");
}

function generateDiscoveryMarkdown(data) {
  const { company, discovery, scores, savings } = data;

  let md = `# SaaS Stack Discovery: ${company}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;

  if (discovery.metadata.company_info) {
    const info = discovery.metadata.company_info;
    md += `## Company Profile\n\n`;
    md += `- **Industry:** ${info.industry || "Unknown"}\n`;
    md += `- **Size:** ${info.size_estimate || "Unknown"}\n`;
    md += `- **Tech Sophistication:** ${info.tech_sophistication || "Unknown"}\n\n`;
  }

  md += `## Discovered Stack\n\n`;
  md += `| Product | Category | Confidence | Source |\n`;
  md += `|---------|----------|------------|--------|\n`;

  for (const p of discovery.combined) {
    md += `| ${p.name} | ${p.category || "Other"} | ${p.confidence} | ${p.sources[0]} |\n`;
  }

  if (scores && scores.length > 0) {
    md += `\n## AI Vulnerability Scores\n\n`;
    md += `| Score | Product | Timeline | Leverage |\n`;
    md += `|-------|---------|----------|----------|\n`;

    for (const r of scores.filter(s => s.success)) {
      const s = r.score;
      md += `| ${s.vulnerability_score}/10 | ${s.product_name} | ${s.replacement_timeline} | ${s.negotiation_leverage.slice(0, 40)}... |\n`;
    }

    if (savings) {
      md += `\n## Negotiation Opportunity\n\n`;
      md += `- **High-vulnerability products:** ${savings.negotiableProducts}\n`;
      md += `- **Estimated negotiable spend:** $${savings.totalEstimatedCost.toLocaleString()}\n`;
      md += `- **Potential savings (15%):** $${savings.potentialSavings.toLocaleString()}\n`;
    }
  }

  return md;
}
