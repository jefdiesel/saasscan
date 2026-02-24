/**
 * Single URL scoring mode
 */

import { scrapePage } from "../lib/scraper.js";
import { scoreProduct, calculateSavings } from "../lib/scorer.js";
import { printSingleReport, generateJsonReport } from "../lib/report.js";

export async function runSingle(url, options = {}) {
  const { json = false, quiet = false } = options;

  if (!quiet) {
    console.log(`\nScoring ${url}...`);
  }

  const productData = await scrapePage(url);
  const score = await scoreProduct(productData);

  if (json) {
    const results = [{ success: true, url, score }];
    const savings = calculateSavings(results);
    const report = generateJsonReport(results, savings, { mode: "single", url });
    console.log(JSON.stringify(report, null, 2));
  } else {
    printSingleReport(score);
  }

  return score;
}
