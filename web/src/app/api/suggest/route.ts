import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Popular companies for suggestions
const POPULAR_COMPANIES = [
  { name: "Stripe", domain: "stripe.com", industry: "Payments" },
  { name: "Shopify", domain: "shopify.com", industry: "E-commerce" },
  { name: "Slack", domain: "slack.com", industry: "Communication" },
  { name: "Notion", domain: "notion.so", industry: "Productivity" },
  { name: "Figma", domain: "figma.com", industry: "Design" },
  { name: "Datadog", domain: "datadoghq.com", industry: "DevOps" },
  { name: "Snowflake", domain: "snowflake.com", industry: "Data" },
  { name: "MongoDB", domain: "mongodb.com", industry: "Database" },
  { name: "Twilio", domain: "twilio.com", industry: "Communication" },
  { name: "Cloudflare", domain: "cloudflare.com", industry: "Infrastructure" },
  { name: "HubSpot", domain: "hubspot.com", industry: "Marketing" },
  { name: "Zendesk", domain: "zendesk.com", industry: "Support" },
  { name: "Salesforce", domain: "salesforce.com", industry: "CRM" },
  { name: "Atlassian", domain: "atlassian.com", industry: "DevOps" },
  { name: "DocuSign", domain: "docusign.com", industry: "Legal" },
  { name: "Zoom", domain: "zoom.us", industry: "Video" },
  { name: "Airtable", domain: "airtable.com", industry: "Productivity" },
  { name: "Intercom", domain: "intercom.com", industry: "Support" },
  { name: "Amplitude", domain: "amplitude.com", industry: "Analytics" },
  { name: "Segment", domain: "segment.com", industry: "Analytics" },
];

// Popular SaaS products
const POPULAR_PRODUCTS = [
  { name: "Salesforce", category: "CRM", users: "150K+" },
  { name: "HubSpot", category: "Marketing", users: "180K+" },
  { name: "Zendesk", category: "Support", users: "100K+" },
  { name: "Slack", category: "Communication", users: "750K+" },
  { name: "Jira", category: "Project Management", users: "200K+" },
  { name: "Intercom", category: "Support", users: "25K+" },
  { name: "Mixpanel", category: "Analytics", users: "26K+" },
  { name: "Segment", category: "Analytics", users: "20K+" },
  { name: "Stripe", category: "Payments", users: "1M+" },
  { name: "Notion", category: "Productivity", users: "30M+" },
  { name: "Figma", category: "Design", users: "4M+" },
  { name: "Datadog", category: "Monitoring", users: "26K+" },
  { name: "Snowflake", category: "Data Warehouse", users: "8K+" },
  { name: "Auth0", category: "Authentication", users: "18K+" },
  { name: "LaunchDarkly", category: "Feature Flags", users: "4K+" },
  { name: "PagerDuty", category: "Incident Management", users: "15K+" },
  { name: "Twilio", category: "Communication", users: "300K+" },
  { name: "SendGrid", category: "Email", users: "80K+" },
  { name: "Okta", category: "Identity", users: "17K+" },
  { name: "Workday", category: "HR", users: "10K+" },
];

// SaaS categories
const CATEGORIES = [
  { name: "Customer Support", products: 50, examples: "Zendesk, Intercom, Freshdesk" },
  { name: "CRM", products: 40, examples: "Salesforce, HubSpot, Pipedrive" },
  { name: "Analytics", products: 35, examples: "Mixpanel, Amplitude, Heap" },
  { name: "Marketing Automation", products: 30, examples: "Marketo, Pardot, Mailchimp" },
  { name: "Project Management", products: 45, examples: "Jira, Asana, Monday.com" },
  { name: "Communication", products: 25, examples: "Slack, Teams, Discord" },
  { name: "HR & Recruiting", products: 40, examples: "Workday, Greenhouse, Lever" },
  { name: "DevOps & Monitoring", products: 50, examples: "Datadog, New Relic, PagerDuty" },
  { name: "Data & Analytics", products: 35, examples: "Snowflake, Databricks, Looker" },
  { name: "Payments", products: 20, examples: "Stripe, Braintree, Adyen" },
  { name: "Authentication", products: 15, examples: "Auth0, Okta, OneLogin" },
  { name: "Email & Messaging", products: 25, examples: "SendGrid, Twilio, Customer.io" },
  { name: "Design & Collaboration", products: 20, examples: "Figma, Miro, InVision" },
  { name: "Document Management", products: 15, examples: "DocuSign, PandaDoc, Dropbox" },
  { name: "Video & Conferencing", products: 15, examples: "Zoom, Loom, Vidyard" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "company";
  const query = searchParams.get("q")?.toLowerCase() || "";

  if (type === "company") {
    if (!query) {
      // Return popular companies as suggestions
      return NextResponse.json({
        suggestions: POPULAR_COMPANIES.slice(0, 8),
        type: "popular",
      });
    }
    // Filter by query
    const matches = POPULAR_COMPANIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.domain.toLowerCase().includes(query) ||
        c.industry.toLowerCase().includes(query)
    );
    return NextResponse.json({
      suggestions: matches.slice(0, 8),
      type: "search",
    });
  }

  if (type === "product") {
    if (!query) {
      return NextResponse.json({
        suggestions: POPULAR_PRODUCTS.slice(0, 8),
        type: "popular",
      });
    }
    const matches = POPULAR_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    return NextResponse.json({
      suggestions: matches.slice(0, 8),
      type: "search",
    });
  }

  if (type === "category") {
    if (!query) {
      return NextResponse.json({
        suggestions: CATEGORIES.slice(0, 8),
        type: "popular",
      });
    }
    const matches = CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.examples.toLowerCase().includes(query)
    );
    return NextResponse.json({
      suggestions: matches.slice(0, 8),
      type: "search",
    });
  }

  return NextResponse.json({ suggestions: [], type: "unknown" });
}

// AI-powered company search for unknown queries
export async function POST(request: NextRequest) {
  try {
    const { query, type } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const prompt = type === "company"
      ? `Suggest 5 well-known tech companies similar to or matching "${query}". Return JSON array: [{"name": "Company", "domain": "domain.com", "industry": "Industry"}]`
      : type === "product"
      ? `Suggest 5 SaaS products similar to or matching "${query}". Return JSON array: [{"name": "Product", "category": "Category", "users": "estimate"}]`
      : `Suggest 5 SaaS categories similar to or matching "${query}". Return JSON array: [{"name": "Category", "products": number, "examples": "Example1, Example2"}]`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const suggestions = JSON.parse(cleaned);

    return NextResponse.json({ suggestions, type: "ai" });
  } catch {
    return NextResponse.json({ suggestions: [], type: "error" });
  }
}
