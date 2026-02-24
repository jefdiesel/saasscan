import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

export async function POST(request: NextRequest) {
  try {
    const { product, industry, size, limit = 25 } = await request.json();

    if (!product || typeof product !== "string") {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    let filterDesc = "";
    if (industry) filterDesc += ` in the ${industry} industry`;
    if (size) filterDesc += ` of ${size} size`;

    const prompt = `Find companies that use "${product}"${filterDesc}.

Search for:
1. Case studies and customer stories on ${product}'s website
2. G2 reviews mentioning company names
3. LinkedIn posts about using ${product}
4. Press releases about ${product} deployments
5. Job postings requiring ${product} experience
6. StackShare profiles listing ${product}

Return ONLY valid JSON:
{
  "product": "${product}",
  "companies": [
    {
      "name": "Company Name",
      "industry": "Their industry",
      "size": "startup/smb/midmarket/enterprise",
      "confidence": "high/medium/low",
      "source": "where you found this",
      "domain": "company.com if known"
    }
  ],
  "total_found": <number>,
  "notes": "any relevant context about ${product}'s market presence"
}

Return up to ${limit} companies, prioritizing well-known names and high-confidence matches.`;

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
