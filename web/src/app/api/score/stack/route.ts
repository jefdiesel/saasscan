import { NextRequest, NextResponse } from "next/server";
import { scrapePage } from "@/lib/scraper";
import { scoreProduct, VulnerabilityScore } from "@/lib/scorer";

interface ScoredProduct {
  success: boolean;
  url: string;
  score?: VulnerabilityScore;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "URLs array is required" }, { status: 400 });
    }

    if (urls.length > 20) {
      return NextResponse.json({ error: "Maximum 20 URLs per request" }, { status: 400 });
    }

    const results: ScoredProduct[] = [];

    // Process URLs with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async (url: string) => {
          const productData = await scrapePage(url);
          const score = await scoreProduct(productData);
          return { url, score };
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const url = batch[j];
        if (result.status === "fulfilled") {
          results.push({ success: true, url, score: result.value.score });
        } else {
          results.push({ success: false, url, error: result.reason?.message || "Unknown error" });
        }
      }
    }

    // Calculate savings
    const successful = results.filter((r) => r.success && r.score);
    let totalCost = 0;
    let negotiable = 0;

    for (const r of successful) {
      if (r.score && r.score.vulnerability_score >= 6 && r.score.estimated_annual_cost) {
        totalCost += r.score.estimated_annual_cost;
        negotiable++;
      }
    }

    const savings = {
      totalEstimatedCost: totalCost,
      negotiableProducts: negotiable,
      potentialSavings: Math.round(totalCost * 0.15),
      discountPercent: 15,
    };

    // Sort by vulnerability score
    results.sort((a, b) => {
      const scoreA = a.score?.vulnerability_score ?? 0;
      const scoreB = b.score?.vulnerability_score ?? 0;
      return scoreB - scoreA;
    });

    return NextResponse.json({ success: true, results, savings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
