/**
 * Report generation utilities
 */

/**
 * Print a single product score to console
 */
export function printSingleReport(score) {
  const bar = "\u2588".repeat(score.vulnerability_score) + "\u2591".repeat(10 - score.vulnerability_score);

  console.log("\n" + "=".repeat(60));
  console.log(`  ${score.product_name}`);
  console.log("=".repeat(60));
  console.log(`\n  Core function: ${score.core_function}`);
  console.log(`\n  AI Vulnerability: [${bar}] ${score.vulnerability_score}/10`);
  console.log(`  Timeline: ${score.replacement_timeline}`);
  console.log(`\n  How it gets replaced:\n  ${score.replacement_mechanism}`);
  console.log(`\n  What protects it:`);
  score.moat_factors.forEach(f => console.log(`    - ${f}`));
  console.log(`\n  Procurement leverage:\n  "${score.negotiation_leverage}"`);
  console.log(`\n  Also at risk: ${score.comparable_at_risk.join(", ")}`);
  if (score.estimated_annual_cost) {
    console.log(`\n  Est. annual cost: $${score.estimated_annual_cost.toLocaleString()}`);
  }

  // Negotiation Script
  if (score.negotiation_script) {
    console.log("\n" + "-".repeat(60));
    console.log("  NEGOTIATION SCRIPT");
    console.log("-".repeat(60));
    console.log(`\n  "${score.negotiation_script}"`);
  }

  // Alternatives
  if (score.alternatives && score.alternatives.length > 0) {
    console.log("\n" + "-".repeat(60));
    console.log("  ALTERNATIVES");
    console.log("-".repeat(60) + "\n");
    for (const alt of score.alternatives) {
      const typeLabel = {
        ai_native: "🤖 AI Native",
        open_source: "🔓 Open Source",
        cheaper_saas: "💰 Cheaper SaaS",
        build_internal: "🏗️  Build Internal"
      }[alt.type] || alt.type;
      console.log(`  ${typeLabel}: ${alt.name}`);
      if (alt.url) console.log(`     URL: ${alt.url}`);
      console.log(`     Savings: ${alt.estimated_savings} | Migration: ${alt.migration_difficulty}`);
      console.log(`     ${alt.description}`);
      console.log();
    }
  }

  // Vendor Lock-in
  if (score.vendor_lock_in && score.vendor_lock_in.length > 0) {
    console.log("-".repeat(60));
    console.log("  VENDOR LOCK-IN FACTORS");
    console.log("-".repeat(60) + "\n");
    for (const lockin of score.vendor_lock_in) {
      const severityColor = {
        high: "🔴",
        medium: "🟡",
        low: "🟢"
      }[lockin.severity] || "";
      console.log(`  ${severityColor} ${lockin.lock_in_type} (${lockin.severity} severity)`);
      console.log(`     Escape tactic: ${lockin.escape_tactic}`);
      console.log(`     Timeline: ${lockin.timeline}`);
      console.log();
    }
  }

  // Escape Plan
  if (score.escape_plan) {
    console.log("-".repeat(60));
    console.log("  6-MONTH ESCAPE PLAN");
    console.log("-".repeat(60));
    console.log(`\n  ${score.escape_plan}`);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Print a stack scan summary report
 */
export function printStackReport(results, savings) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  // Sort by vulnerability score descending
  successful.sort((a, b) => b.score.vulnerability_score - a.score.vulnerability_score);

  console.log("\n" + "=".repeat(70));
  console.log("  SAAS STACK AI VULNERABILITY REPORT");
  console.log("=".repeat(70));

  console.log(`\n  Scanned: ${results.length} products`);
  console.log(`  Scored: ${successful.length} | Failed: ${failed.length}`);

  console.log("\n" + "-".repeat(70));
  console.log("  RANKED BY VULNERABILITY (highest risk first)");
  console.log("-".repeat(70) + "\n");

  for (const result of successful) {
    const s = result.score;
    const bar = "\u2588".repeat(s.vulnerability_score) + "\u2591".repeat(10 - s.vulnerability_score);
    const cost = s.estimated_annual_cost ? `$${s.estimated_annual_cost.toLocaleString()}/yr` : "cost unknown";

    console.log(`  [${bar}] ${s.vulnerability_score}/10  ${s.product_name}`);
    console.log(`     ${s.core_function}`);
    console.log(`     Timeline: ${s.replacement_timeline} | ${cost}`);
    console.log(`     Leverage: "${s.negotiation_leverage.slice(0, 80)}..."`);

    // Show top alternatives if available
    if (s.alternatives && s.alternatives.length > 0) {
      const topAlts = s.alternatives.slice(0, 2).map(a => `${a.name} (${a.type})`).join(", ");
      console.log(`     Alternatives: ${topAlts}`);
    }

    // Show lock-in severity if available
    if (s.vendor_lock_in && s.vendor_lock_in.length > 0) {
      const highSeverity = s.vendor_lock_in.filter(l => l.severity === "high").length;
      const medSeverity = s.vendor_lock_in.filter(l => l.severity === "medium").length;
      console.log(`     Lock-in: ${highSeverity} high, ${medSeverity} medium severity factors`);
    }
    console.log();
  }

  if (failed.length > 0) {
    console.log("-".repeat(70));
    console.log("  FAILED TO SCORE");
    console.log("-".repeat(70) + "\n");
    for (const f of failed) {
      console.log(`  - ${f.url}: ${f.error}`);
    }
    console.log();
  }

  console.log("-".repeat(70));
  console.log("  NEGOTIATION LEVERAGE SUMMARY");
  console.log("-".repeat(70) + "\n");

  console.log(`  Products with high AI vulnerability (score >= 6): ${savings.negotiableProducts}`);
  console.log(`  Combined estimated annual spend: $${savings.totalEstimatedCost.toLocaleString()}`);
  console.log(`  Potential savings (${savings.discountPercent}% discount): $${savings.potentialSavings.toLocaleString()}`);

  console.log("\n" + "=".repeat(70) + "\n");
}

/**
 * Print company scan report with inferred stack
 */
export function printCompanyReport(companyName, inferredStack, results, savings) {
  console.log("\n" + "=".repeat(70));
  console.log(`  COMPANY AI VULNERABILITY ASSESSMENT: ${companyName.toUpperCase()}`);
  console.log("=".repeat(70));

  console.log("\n  INFERRED SAAS STACK:");
  console.log("-".repeat(70));
  for (const product of inferredStack) {
    console.log(`  - ${product.name} (${product.category}) - ${product.confidence} confidence`);
    if (product.source) console.log(`    Source: ${product.source}`);
  }

  console.log();
  printStackReport(results, savings);
}

/**
 * Generate JSON report for export
 */
export function generateJsonReport(results, savings, metadata = {}) {
  const successful = results.filter(r => r.success);
  successful.sort((a, b) => b.score.vulnerability_score - a.score.vulnerability_score);

  return {
    generated_at: new Date().toISOString(),
    ...metadata,
    summary: {
      total_scanned: results.length,
      successful: successful.length,
      failed: results.filter(r => !r.success).length,
      high_vulnerability_count: successful.filter(r => r.score.vulnerability_score >= 7).length,
      ...savings,
    },
    products: successful.map(r => r.score),
    errors: results.filter(r => !r.success).map(r => ({ url: r.url, error: r.error })),
  };
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(results, savings, metadata = {}) {
  const successful = results.filter(r => r.success);
  successful.sort((a, b) => b.score.vulnerability_score - a.score.vulnerability_score);

  let md = `# SaaS AI Vulnerability Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;

  if (metadata.company) {
    md += `**Company:** ${metadata.company}\n\n`;
  }

  md += `## Summary\n\n`;
  md += `- **Products Scanned:** ${results.length}\n`;
  md += `- **Successfully Scored:** ${successful.length}\n`;
  md += `- **High Vulnerability (7+):** ${successful.filter(r => r.score.vulnerability_score >= 7).length}\n`;
  md += `- **Estimated Annual Spend (negotiable):** $${savings.totalEstimatedCost.toLocaleString()}\n`;
  md += `- **Potential Savings (${savings.discountPercent}%):** $${savings.potentialSavings.toLocaleString()}\n\n`;

  md += `## Products Ranked by Vulnerability\n\n`;
  md += `| Score | Product | Timeline | Leverage |\n`;
  md += `|-------|---------|----------|----------|\n`;

  for (const r of successful) {
    const s = r.score;
    md += `| ${s.vulnerability_score}/10 | **${s.product_name}** | ${s.replacement_timeline} | ${s.negotiation_leverage.slice(0, 50)}... |\n`;
  }

  md += `\n## Detailed Analysis\n\n`;

  for (const r of successful) {
    const s = r.score;
    md += `### ${s.product_name} (${s.vulnerability_score}/10)\n\n`;
    md += `**Core Function:** ${s.core_function}\n\n`;
    md += `**Replacement Timeline:** ${s.replacement_timeline}\n\n`;
    md += `**How it gets replaced:** ${s.replacement_mechanism}\n\n`;
    md += `**Moat Factors:**\n`;
    s.moat_factors.forEach(f => { md += `- ${f}\n`; });
    md += `\n**Procurement Leverage:** "${s.negotiation_leverage}"\n\n`;

    // Negotiation Script
    if (s.negotiation_script) {
      md += `#### 💬 Negotiation Script\n\n`;
      md += `> "${s.negotiation_script}"\n\n`;
    }

    // Alternatives
    if (s.alternatives && s.alternatives.length > 0) {
      md += `#### 🔄 Alternatives\n\n`;
      md += `| Name | Type | Savings | Migration | Description |\n`;
      md += `|------|------|---------|-----------|-------------|\n`;
      for (const alt of s.alternatives) {
        const typeEmoji = {
          ai_native: "🤖",
          open_source: "🔓",
          cheaper_saas: "💰",
          build_internal: "🏗️"
        }[alt.type] || "";
        const url = alt.url ? `[${alt.name}](${alt.url})` : alt.name;
        md += `| ${url} | ${typeEmoji} ${alt.type} | ${alt.estimated_savings} | ${alt.migration_difficulty} | ${alt.description} |\n`;
      }
      md += `\n`;
    }

    // Vendor Lock-in
    if (s.vendor_lock_in && s.vendor_lock_in.length > 0) {
      md += `#### 🔒 Vendor Lock-in Factors\n\n`;
      md += `| Lock-in Type | Severity | Escape Tactic | Timeline |\n`;
      md += `|--------------|----------|---------------|----------|\n`;
      for (const lockin of s.vendor_lock_in) {
        const severityEmoji = { high: "🔴", medium: "🟡", low: "🟢" }[lockin.severity] || "";
        md += `| ${lockin.lock_in_type} | ${severityEmoji} ${lockin.severity} | ${lockin.escape_tactic} | ${lockin.timeline} |\n`;
      }
      md += `\n`;
    }

    // Escape Plan
    if (s.escape_plan) {
      md += `#### 🚀 6-Month Escape Plan\n\n`;
      md += `${s.escape_plan}\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}
