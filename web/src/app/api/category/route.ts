import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

export async function POST(request: NextRequest) {
  try {
    const { category } = await request.json();

    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const prompt = `Analyze the "${category}" SaaS category for AI vulnerability.

Provide a comprehensive market analysis:

1. **Major Players** - List the top 10-15 products in this category
2. **AI Disruption Status** - How is AI already impacting this category?
3. **Vulnerability Assessment** - Which products are most/least vulnerable?
4. **Emerging Alternatives** - What AI-native alternatives are emerging?
5. **Timeline** - When will AI meaningfully disrupt this category?

Return ONLY valid JSON:
{
  "category": "${category}",
  "market_size_estimate": "string",
  "ai_disruption_stage": "early/growing/accelerating/mature",
  "products": [
    {
      "name": "Product Name",
      "url": "https://product.com",
      "market_position": "leader/challenger/niche",
      "vulnerability_estimate": 1-10,
      "key_vulnerability": "why it's vulnerable",
      "key_moat": "what protects it"
    }
  ],
  "emerging_ai_alternatives": [
    {
      "name": "AI Alternative",
      "url": "https://alternative.com",
      "threat_level": "high/medium/low",
      "description": "what it does"
    }
  ],
  "disruption_timeline": "string describing expected timeline",
  "procurement_advice": "what procurement teams should do about this category"
}`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
