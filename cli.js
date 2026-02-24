#!/usr/bin/env node

/**
 * SaaS AI Vulnerability Scorer - CLI
 *
 * Score SaaS products on their vulnerability to AI replacement.
 * Generate board-ready reports for procurement teams and investors.
 *
 * Usage:
 *   saas-scorer url <product-url>           Score a single product
 *   saas-scorer stack <csv-file>            Score all products in CSV
 *   saas-scorer company <company-name>      Infer and score a company's stack
 *
 * Options:
 *   --json                Output as JSON
 *   --markdown            Output as Markdown
 *   --output <file>       Write output to file
 *   --quiet               Suppress progress messages
 *   --help                Show this help
 *
 * Examples:
 *   saas-scorer url https://www.zendesk.com
 *   saas-scorer stack ./our-saas-tools.csv --json --output report.json
 *   saas-scorer company "Acme Corp" --markdown --output vulnerability-report.md
 */

import { runSingle } from "./modes/single.js";
import { runStack } from "./modes/stack.js";
import { runCompany } from "./modes/company.js";

function printHelp() {
  console.log(`
SaaS AI Vulnerability Scorer

Score SaaS products on their vulnerability to AI replacement.
Generate board-ready reports for procurement teams and investors.

USAGE:
  saas-scorer <mode> <target> [options]

MODES:
  url <product-url>        Score a single SaaS product by URL
  stack <csv-file>         Score all products listed in a CSV file
  company <company-name>   Infer a company's SaaS stack and score it

OPTIONS:
  --json                   Output results as JSON
  --markdown               Output results as Markdown
  --output <file>          Write output to a file instead of stdout
  --quiet                  Suppress progress messages
  --help                   Show this help message

EXAMPLES:
  # Score a single product
  saas-scorer url https://www.zendesk.com

  # Score a stack from CSV (expects 'url' column or plain list)
  saas-scorer stack ./our-tools.csv

  # Generate JSON report
  saas-scorer stack ./tools.csv --json --output report.json

  # Infer and score a company's stack
  saas-scorer company "Stripe" --markdown --output stripe-report.md

CSV FORMAT:
  The CSV should have URLs in a column named 'url' or as the first column.
  Example:
    url,notes
    https://www.zendesk.com,Customer support
    https://www.salesforce.com,CRM

OUTPUT:
  Each product receives a vulnerability score from 1-10:
    1-3: Low risk - significant moats protect this product
    4-6: Medium risk - partially replaceable, negotiate renewals
    7-10: High risk - actively replaceable by AI, strong leverage

  Reports include negotiation leverage statements for procurement.
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
    console.error(`Error: Missing target for mode '${args.mode}'`);
    console.error(`Run 'saas-scorer --help' for usage information.`);
    process.exit(1);
  }

  const options = {
    json: args.json,
    markdown: args.markdown,
    output: args.output,
    quiet: args.quiet,
  };

  try {
    switch (args.mode) {
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

      default:
        console.error(`Unknown mode: ${args.mode}`);
        console.error(`Valid modes: url, stack, company`);
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
