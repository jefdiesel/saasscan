#!/usr/bin/env node

/**
 * SaaS AI Vulnerability Scorer - CLI
 *
 * Discover, analyze, and score SaaS products on AI replacement vulnerability.
 * Generate board-ready reports for procurement teams and investors.
 */

import { runSingle } from "./modes/single.js";
import { runStack } from "./modes/stack.js";
import { runCompany } from "./modes/company.js";
import { runDiscover, runBulkDiscover, runReverseLookup, runCategoryAnalysis } from "./modes/discover.js";

function printHelp() {
  console.log(`
SaaS AI Vulnerability Scorer

Discover, analyze, and score SaaS products on AI replacement vulnerability.
Generate board-ready reports for procurement teams and investors.

USAGE:
  saas-scorer <command> <target> [options]

SCORING COMMANDS:
  url <product-url>        Score a single SaaS product by URL
  stack <csv-file>         Score all products listed in a CSV file
  company <company-name>   Infer a company's SaaS stack and score it

DISCOVERY COMMANDS:
  discover <company>       Full discovery: website detection + AI inference + scoring
  bulk <csv-file>          Bulk discover stacks for multiple companies
  find <product-name>      Reverse lookup: find companies using a product
  category <category>      Analyze a SaaS category for AI vulnerability

OPTIONS:
  --json                   Output results as JSON
  --markdown               Output results as Markdown
  --output <file>          Write output to a file instead of stdout
  --quiet                  Suppress progress messages
  --no-score               Skip vulnerability scoring (discover only)
  --industry <industry>    Filter by industry (for 'find' command)
  --size <size>            Filter by company size (for 'find' command)
  --help                   Show this help message

EXAMPLES:
  # Score a single product
  saas-scorer url https://www.zendesk.com

  # Full discovery for a company (website scan + AI inference + scoring)
  saas-scorer discover stripe.com

  # Bulk discover multiple companies
  saas-scorer bulk ./companies.csv --json --output discovery.json

  # Find companies using a specific product
  saas-scorer find "Salesforce" --industry fintech

  # Analyze a SaaS category
  saas-scorer category "Customer Support" --markdown

  # Score a stack from CSV
  saas-scorer stack ./tools.csv --json --output report.json

  # Infer and score a company's stack (simpler than discover)
  saas-scorer company "Acme Corp"

OUTPUT:
  Each product receives a vulnerability score from 1-10:
    1-3: Low risk - significant moats protect this product
    4-6: Medium risk - partially replaceable, negotiate renewals
    7-10: High risk - actively replaceable by AI, strong leverage

  Discovery shows products found via:
    [H] High confidence    [M] Medium confidence    [L] Low confidence
`);
}

function parseArgs(args) {
  const parsed = {
    mode: null,
    target: null,
    json: false,
    markdown: false,
    output: null,
    quiet: false,
    help: false,
    score: true,
    industry: null,
    size: null,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--markdown" || arg === "--md") {
      parsed.markdown = true;
    } else if (arg === "--output" || arg === "-o") {
      parsed.output = args[++i];
    } else if (arg === "--quiet" || arg === "-q") {
      parsed.quiet = true;
    } else if (arg === "--no-score") {
      parsed.score = false;
    } else if (arg === "--industry") {
      parsed.industry = args[++i];
    } else if (arg === "--size") {
      parsed.size = args[++i];
    } else if (!arg.startsWith("-")) {
      if (!parsed.mode) {
        parsed.mode = arg;
      } else if (!parsed.target) {
        parsed.target = arg;
      }
    }
    i++;
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.mode) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  if (!args.target) {
    console.error(`Error: Missing target for command '${args.mode}'`);
    console.error(`Run 'saas-scorer --help' for usage information.`);
    process.exit(1);
  }

  const options = {
    json: args.json,
    markdown: args.markdown,
    output: args.output,
    quiet: args.quiet,
    score: args.score,
    industry: args.industry,
    size: args.size,
  };

  try {
    switch (args.mode) {
      // Scoring commands
      case "url":
      case "single":
        await runSingle(args.target, options);
        break;

      case "stack":
      case "csv":
        await runStack(args.target, options);
        break;

      case "company":
      case "org":
        await runCompany(args.target, options);
        break;

      // Discovery commands
      case "discover":
      case "scan":
        await runDiscover(args.target, options);
        break;

      case "bulk":
      case "batch":
        await runBulkDiscover(args.target, options);
        break;

      case "find":
      case "reverse":
      case "lookup":
        await runReverseLookup(args.target, options);
        break;

      case "category":
      case "market":
        await runCategoryAnalysis(args.target, options);
        break;

      default:
        console.error(`Unknown command: ${args.mode}`);
        console.error(`Valid commands: url, stack, company, discover, bulk, find, category`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
