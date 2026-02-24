import { NextRequest, NextResponse } from "next/server";
import { scrapePage } from "@/lib/scraper";
import { scoreProduct, inferSaasStack, VulnerabilityScore } from "@/lib/scorer";

interface ScoredProduct {
  success: boolean;
  url: string;
  score?: VulnerabilityScore;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { company } = await request.json();

    if (!company || typeof company !== "string") {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    // Infer the stack
    const stackInfo = await inferSaasStack(company);

    if (!stackInfo.inferred_stack || stackInfo.inferred_stack.length === 0) {
      return NextResponse.json(
        { error: `Could not infer any SaaS products for "${company}"` },
        { status: 404 }
      );
    }

    // Extract valid URLs
    const productsWithUrls = stackInfo.inferred_stack.filter(
      (p) => p.url && (p.url.startsWith("http://") || p.url.startsWith("https://"))
    );

    const results: ScoredProduct[] = [];

    // Score products with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < productsWithUrls.length; i += concurrency) {
      const batch = productsWithUrls.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async (product) => {
          const productData = await scrapePage(product.url);
          const score = await scoreProduct(productData);
          return { url: product.url, score };
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const url = batch[j].url;
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

    return NextResponse.json({
      success: true,
      company,
      inferredStack: stackInfo.inferred_stack,
      notes: stackInfo.notes,
      results,
      savings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
