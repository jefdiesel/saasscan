import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { detectFromWebsite } from "@/lib/detect";
import { scrapePage } from "@/lib/scraper";
import { scoreProduct, VulnerabilityScore } from "@/lib/scorer";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

interface InferredProduct {
  name: string;
  category: string;
  url: string;
  confidence: "high" | "medium" | "low";
  source: string;
  evidence?: string;
}

async function inferStackFromSources(companyName: string): Promise<{
  company_info: { name: string; industry: string; size_estimate: string; tech_sophistication: string };
  sources_checked: string[];
  products: InferredProduct[];
}> {
  const prompt = `You are a technology analyst researching the software stack used by "${companyName}".

Search comprehensively across these sources:
1. Job Postings - Look for their careers page and job boards
2. LinkedIn - Check employee profiles
3. G2/Capterra Reviews - Search for reviews where this company is mentioned
4. StackShare/BuiltWith - Check if they have a public stack profile
5. Tech Blog/Engineering Blog - Many companies blog about their stack choices
6. Press Releases/Case Studies - SaaS vendors often publish customer wins

Return ONLY valid JSON:
{
  "company_info": {
    "name": "Official company name",
    "industry": "Their industry",
    "size_estimate": "startup/smb/midmarket/enterprise",
    "tech_sophistication": "low/medium/high"
  },
  "sources_checked": ["list of sources you found data from"],
  "products": [
    {
      "name": "Product Name",
      "category": "CRM/Analytics/Support/HR/DevOps/etc",
      "url": "https://product-url.com",
      "confidence": "high/medium/low",
      "source": "where you found this",
      "evidence": "brief quote or description of the evidence"
    }
  ]
}

Be thorough. Include 10-25 products if possible.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const { company, includeScoring = true } = await request.json();

    if (!company || typeof company !== "string") {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    // Extract domain
    let domain: string | null = null;
    if (company.startsWith("http")) {
      domain = new URL(company).hostname;
    } else if (company.includes(".") && !company.includes(" ")) {
      domain = company.replace(/^www\./, "");
    } else {
      domain = `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    }

    // Website detection
    const detected = domain ? await detectFromWebsite(domain) : [];

    // AI inference
    const inferred = await inferStackFromSources(company);

    // Combine results
    const combined = new Map<string, {
      name: string;
      category: string;
      url: string | null;
      confidence: string;
      sources: string[];
      evidence: string[];
    }>();

    for (const product of detected) {
      combined.set(product.name.toLowerCase(), {
        name: product.name,
        category: product.category,
        url: product.url,
        confidence: product.confidence,
        sources: ["website_detection"],
        evidence: product.evidence,
      });
    }

    for (const product of inferred.products) {
      const key = product.name.toLowerCase();
      const existing = combined.get(key);
      if (existing) {
        existing.confidence = "high";
        existing.sources.push(product.source);
        if (product.evidence) existing.evidence.push(product.evidence);
      } else {
        combined.set(key, {
          name: product.name,
          category: product.category,
          url: product.url || null,
          confidence: product.confidence,
          sources: [product.source],
          evidence: product.evidence ? [product.evidence] : [],
        });
      }
    }

    const combinedList = Array.from(combined.values()).sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (order[a.confidence] || 2) - (order[b.confidence] || 2);
    });

    // Optional scoring
    let scores: { success: boolean; url: string; score?: VulnerabilityScore; error?: string }[] = [];
    let savings = null;

    if (includeScoring) {
      const urls = combinedList
        .filter((p) => p.url)
        .map((p) => p.url!)
        .slice(0, 10);

      for (const url of urls) {
        try {
          const productData = await scrapePage(url);
          const score = await scoreProduct(productData);
          scores.push({ success: true, url, score });
        } catch (err) {
          scores.push({ success: false, url, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }

      // Calculate savings
      const successful = scores.filter((s) => s.success && s.score);
      let totalCost = 0;
      let negotiable = 0;
      for (const s of successful) {
        if (s.score && s.score.vulnerability_score >= 6 && s.score.estimated_annual_cost) {
          totalCost += s.score.estimated_annual_cost;
          negotiable++;
        }
      }
      savings = {
        totalEstimatedCost: totalCost,
        negotiableProducts: negotiable,
        potentialSavings: Math.round(totalCost * 0.15),
        discountPercent: 15,
      };

      scores.sort((a, b) => (b.score?.vulnerability_score ?? 0) - (a.score?.vulnerability_score ?? 0));
    }

    return NextResponse.json({
      success: true,
      company,
      companyInfo: inferred.company_info,
      detected: detected.length,
      inferred: inferred.products.length,
      combined: combinedList,
      scores,
      savings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
