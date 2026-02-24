import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0 (compatible; SaaSScorer/1.0)";

export interface ProductData {
  url: string;
  title: string;
  metaDesc: string;
  h1s: string;
  h2s: string;
  bodyText: string;
}

export async function scrapePage(url: string): Promise<ProductData> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $("nav, footer, script, style, noscript, header, aside").remove();

  const title = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().join(" | ");
  const h2s = $("h2").map((_, el) => $(el).text().trim()).get().slice(0, 10).join(" | ");
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

  return { url, title, metaDesc, h1s, h2s, bodyText };
}
