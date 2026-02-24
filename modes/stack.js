/**
 * Stack scan mode - score multiple products from CSV
 */

import { readFileSync } from "fs";
import { scrapePage, scrapePages } from "../lib/scraper.js";
import { scoreProduct, scoreProducts, calculateSavings } from "../lib/scorer.js";
import { printStackReport, generateJsonReport, generateMarkdownReport } from "../lib/report.js";

/**
 * Parse CSV file with product URLs
 * Expects either single column of URLs or column named 'url'
 */
function parseCSV(filepath) {
  const content = readFileSync(filepath, "utf-8");
  const lines = content.trim().split("\n");

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("url") || header.includes("product");

  let urls = [];

  if (hasHeader) {
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const urlIndex = headers.findIndex(h => h === "url" || h === "product_url" || h === "link");

    if (urlIndex === -1) {
      // Fall back to first column
      urls = lines.slice(1).map(line => line.split(",")[0].trim());
    } else {
      urls = lines.slice(1).map(line => {
        const cols = line.split(",");
        return cols[urlIndex]?.trim();
      });
    }
  } else {
    // No header, treat each line as URL
    urls = lines.map(line => line.split(",")[0].trim());
  }

  // Filter valid URLs
  return urls.filter(url => url && (url.startsWith("http://") || url.startsWith("https://")));
}

export async function runStack(csvPath, options = {}) {
  const { json = false, markdown = false, output = null, quiet = false } = options;

  if (!quiet) {
    console.log(`\nLoading stack from ${csvPath}...`);
  }

  const urls = parseCSV(csvPath);

  if (urls.length === 0) {
    throw new Error("No valid URLs found in CSV");
  }

  if (!quiet) {
    console.log(`Found ${urls.length} products to score\n`);
  }

  // Scrape all pages
  if (!quiet) {
    console.log("Scraping product pages...");
  }

  const scrapeResults = await scrapePages(urls);
  const successfulScrapes = scrapeResults.filter(r => r.success);

  if (!quiet) {
    console.log(`Scraped ${successfulScrapes.length}/${urls.length} pages successfully\n`);
    console.log("Scoring with AI...");
  }

  // Score all successfully scraped products
  const productDataList = successfulScrapes.map(r => r.data);
  const scoreResults = await scoreProducts(productDataList);

  // Merge scrape failures into results
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
  if (json) {
    const report = generateJsonReport(allResults, savings, { mode: "stack", source: csvPath });
    const jsonOutput = JSON.stringify(report, null, 2);

    if (output) {
      const { writeFileSync } = await import("fs");
      writeFileSync(output, jsonOutput);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(jsonOutput);
    }
  } else if (markdown) {
    const md = generateMarkdownReport(allResults, savings, { mode: "stack", source: csvPath });

    if (output) {
      const { writeFileSync } = await import("fs");
      writeFileSync(output, md);
      console.log(`Report saved to ${output}`);
    } else {
      console.log(md);
    }
  } else {
    printStackReport(allResults, savings);
  }

  return { results: allResults, savings };
}
