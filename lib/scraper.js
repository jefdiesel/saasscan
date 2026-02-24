/**
 * Web scraping utilities for extracting product information
 */

import * as cheerio from "cheerio";
import fetch from "node-fetch";

const USER_AGENT = "Mozilla/5.0 (compatible; SaaSScorer/1.0)";

/**
 * Scrape a product page and extract meaningful content
 */
export async function scrapePage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    timeout: 15000,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Strip nav/footer/script noise
  $("nav, footer, script, style, noscript, header, aside").remove();

  const title = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().join(" | ");
  const h2s = $("h2").map((_, el) => $(el).text().trim()).get().slice(0, 10).join(" | ");
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

  return { url, title, metaDesc, h1s, h2s, bodyText };
}

/**
 * Scrape multiple pages concurrently with rate limiting
 */
export async function scrapePages(urls, { concurrency = 3, delayMs = 500 } = {}) {
  const results = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(url => scrapePage(url))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === "fulfilled") {
        results.push({ success: true, data: result.value });
      } else {
        results.push({ success: false, url: batch[j], error: result.reason.message });
      }
    }

    // Rate limit between batches
    if (i + concurrency < urls.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}
