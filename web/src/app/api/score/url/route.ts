import { NextRequest, NextResponse } from "next/server";
import { scrapePage } from "@/lib/scraper";
import { scoreProduct } from "@/lib/scorer";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const productData = await scrapePage(url);
    const score = await scoreProduct(productData);

    return NextResponse.json({ success: true, score });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
