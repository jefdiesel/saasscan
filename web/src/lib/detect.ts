import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0 (compatible; SaaSScorer/1.0)";

// SaaS fingerprint database
const FINGERPRINTS: Record<string, { scripts?: RegExp[]; globals?: string[]; meta?: RegExp[]; headers?: RegExp[]; iframes?: RegExp[] }> = {
  "Google Analytics": {
    scripts: [/google-analytics\.com/, /googletagmanager\.com/, /gtag\/js/],
    globals: ["ga", "gtag", "_gaq"],
  },
  "Segment": {
    scripts: [/cdn\.segment\.com/, /segment\.io/],
    globals: ["analytics"],
  },
  "Mixpanel": {
    scripts: [/cdn\.mxpnl\.com/, /mixpanel\.com/],
    globals: ["mixpanel"],
  },
  "Amplitude": {
    scripts: [/cdn\.amplitude\.com/, /amplitude\.com/],
    globals: ["amplitude"],
  },
  "Hotjar": {
    scripts: [/static\.hotjar\.com/, /hotjar\.com/],
    globals: ["hj", "hjSiteSettings"],
  },
  "Intercom": {
    scripts: [/widget\.intercom\.io/, /intercom\.io/],
    globals: ["Intercom"],
  },
  "Zendesk": {
    scripts: [/static\.zdassets\.com/, /zendesk\.com/],
    globals: ["zE", "zESettings"],
  },
  "Drift": {
    scripts: [/js\.driftt\.com/, /drift\.com/],
    globals: ["drift"],
  },
  "HubSpot": {
    scripts: [/js\.hs-scripts\.com/, /hubspot\.com/],
    globals: ["HubSpotConversations", "_hsq"],
  },
  "Stripe": {
    scripts: [/js\.stripe\.com/],
    globals: ["Stripe"],
  },
  "Sentry": {
    scripts: [/browser\.sentry-cdn\.com/, /sentry\.io/],
    globals: ["Sentry"],
  },
  "Datadog": {
    scripts: [/datadoghq\.com/, /datadog-rum/],
    globals: ["DD_RUM"],
  },
  "LaunchDarkly": {
    scripts: [/launchdarkly\.com/],
    globals: ["LDClient"],
  },
  "Cloudflare": {
    headers: [/cf-ray/i],
    scripts: [/cloudflare\.com/],
  },
  "Calendly": {
    scripts: [/calendly\.com/],
    iframes: [/calendly\.com/],
  },
  "Greenhouse": {
    scripts: [/boards\.greenhouse\.io/],
    iframes: [/greenhouse\.io/],
  },
  "Lever": {
    scripts: [/jobs\.lever\.co/],
    iframes: [/lever\.co/],
  },
};

const PRODUCT_URLS: Record<string, string> = {
  "Google Analytics": "https://analytics.google.com",
  "Segment": "https://segment.com",
  "Mixpanel": "https://mixpanel.com",
  "Amplitude": "https://amplitude.com",
  "Hotjar": "https://hotjar.com",
  "Intercom": "https://intercom.com",
  "Zendesk": "https://zendesk.com",
  "Drift": "https://drift.com",
  "HubSpot": "https://hubspot.com",
  "Stripe": "https://stripe.com",
  "Sentry": "https://sentry.io",
  "Datadog": "https://datadoghq.com",
  "LaunchDarkly": "https://launchdarkly.com",
  "Cloudflare": "https://cloudflare.com",
  "Calendly": "https://calendly.com",
  "Greenhouse": "https://greenhouse.io",
  "Lever": "https://lever.co",
};

const CATEGORIES: Record<string, string[]> = {
  Analytics: ["Google Analytics", "Segment", "Mixpanel", "Amplitude"],
  "Session Recording": ["Hotjar"],
  "Customer Support": ["Intercom", "Zendesk", "Drift", "HubSpot"],
  Payments: ["Stripe"],
  "Error Tracking": ["Sentry", "Datadog"],
  "Feature Flags": ["LaunchDarkly"],
  Infrastructure: ["Cloudflare"],
  HR: ["Greenhouse", "Lever"],
  Scheduling: ["Calendly"],
};

export interface DetectedProduct {
  name: string;
  confidence: "high" | "medium" | "low";
  score: number;
  evidence: string[];
  url: string | null;
  category: string;
  source: string;
}

export async function detectFromWebsite(domain: string): Promise<DetectedProduct[]> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const detected = new Map<string, DetectedProduct>();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    const html = await res.text();
    const headers = Object.fromEntries(res.headers);
    const $ = cheerio.load(html);

    const scripts: string[] = [];
    $("script[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src) scripts.push(src);
    });

    const inlineScripts: string[] = [];
    $("script:not([src])").each((_, el) => {
      const content = $(el).html();
      if (content) inlineScripts.push(content);
    });

    const iframes: string[] = [];
    $("iframe[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src) iframes.push(src);
    });

    for (const [product, fingerprint] of Object.entries(FINGERPRINTS)) {
      let confidence = 0;
      const evidence: string[] = [];

      if (fingerprint.scripts) {
        for (const pattern of fingerprint.scripts) {
          for (const src of scripts) {
            if (pattern.test(src)) {
              confidence += 40;
              evidence.push(`script: ${src.slice(0, 50)}`);
              break;
            }
          }
        }
      }

      if (fingerprint.globals) {
        for (const global of fingerprint.globals) {
          const pattern = new RegExp(`\\b${global}\\b`);
          for (const script of inlineScripts) {
            if (pattern.test(script)) {
              confidence += 30;
              evidence.push(`global: ${global}`);
              break;
            }
          }
        }
      }

      if (fingerprint.headers) {
        for (const pattern of fingerprint.headers) {
          for (const [key, value] of Object.entries(headers)) {
            if (pattern.test(key) || pattern.test(String(value))) {
              confidence += 25;
              evidence.push(`header: ${key}`);
              break;
            }
          }
        }
      }

      if (fingerprint.iframes) {
        for (const pattern of fingerprint.iframes) {
          for (const src of iframes) {
            if (pattern.test(src)) {
              confidence += 35;
              evidence.push(`iframe: ${src.slice(0, 50)}`);
              break;
            }
          }
        }
      }

      if (confidence > 0) {
        let category = "Other";
        for (const [cat, products] of Object.entries(CATEGORIES)) {
          if (products.includes(product)) {
            category = cat;
            break;
          }
        }

        detected.set(product, {
          name: product,
          confidence: confidence >= 60 ? "high" : confidence >= 30 ? "medium" : "low",
          score: Math.min(confidence, 100),
          evidence,
          url: PRODUCT_URLS[product] || null,
          category,
          source: "website_detection",
        });
      }
    }
  } catch (err) {
    console.error(`Detection error for ${domain}:`, err);
  }

  return Array.from(detected.values()).sort((a, b) => b.score - a.score);
}
