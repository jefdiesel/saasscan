/**
 * Website tech detection - fingerprint SaaS from scripts, cookies, DNS, headers
 */

import * as cheerio from "cheerio";
import fetch from "node-fetch";
import { promisify } from "util";
import dns from "dns";

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolveMx = promisify(dns.resolveMx);

const USER_AGENT = "Mozilla/5.0 (compatible; SaaSScorer/1.0)";

// SaaS fingerprint database
const FINGERPRINTS = {
  // Analytics & Tracking
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
  "Heap": {
    scripts: [/heap-.*\.js/, /heapanalytics\.com/],
    globals: ["heap"],
  },
  "Hotjar": {
    scripts: [/static\.hotjar\.com/, /hotjar\.com/],
    globals: ["hj", "hjSiteSettings"],
  },
  "FullStory": {
    scripts: [/fullstory\.com/],
    globals: ["FS"],
  },
  "Pendo": {
    scripts: [/cdn\.pendo\.io/, /pendo\.io/],
    globals: ["pendo"],
  },
  "LogRocket": {
    scripts: [/cdn\.logrocket\.io/, /logrocket\.com/],
    globals: ["LogRocket"],
  },

  // Customer Support
  "Intercom": {
    scripts: [/widget\.intercom\.io/, /intercom\.io/],
    globals: ["Intercom"],
    meta: [/intercom-app-id/],
  },
  "Zendesk": {
    scripts: [/static\.zdassets\.com/, /zendesk\.com/],
    globals: ["zE", "zESettings"],
  },
  "Drift": {
    scripts: [/js\.driftt\.com/, /drift\.com/],
    globals: ["drift"],
  },
  "Crisp": {
    scripts: [/client\.crisp\.chat/],
    globals: ["$crisp", "CRISP_WEBSITE_ID"],
  },
  "Freshdesk": {
    scripts: [/widget\.freshdesk\.com/, /freshdesk\.com/],
  },
  "HubSpot": {
    scripts: [/js\.hs-scripts\.com/, /hubspot\.com/, /hs-banner\.com/],
    globals: ["HubSpotConversations", "_hsq"],
  },

  // Marketing & CRM
  "Salesforce": {
    scripts: [/salesforce\.com/, /force\.com/],
    dns: [/salesforce/, /_domainkey\.salesforce/],
  },
  "Marketo": {
    scripts: [/munchkin\.marketo\.net/, /marketo\.com/],
    globals: ["Munchkin"],
  },
  "Pardot": {
    scripts: [/pi\.pardot\.com/, /pardot\.com/],
  },
  "Mailchimp": {
    scripts: [/chimpstatic\.com/, /mailchimp\.com/],
  },
  "Klaviyo": {
    scripts: [/static\.klaviyo\.com/, /klaviyo\.com/],
    globals: ["klaviyo", "_learnq"],
  },
  "Customer.io": {
    scripts: [/track\.customer\.io/],
    globals: ["_cio"],
  },
  "Braze": {
    scripts: [/js\.appboycdn\.com/, /braze\.com/],
    globals: ["appboy", "braze"],
  },

  // Authentication
  "Auth0": {
    scripts: [/cdn\.auth0\.com/, /auth0\.com/],
    globals: ["auth0"],
  },
  "Okta": {
    scripts: [/ok\d+\.com/, /okta\.com/],
    dns: [/okta/],
  },
  "Firebase": {
    scripts: [/firebase\.google\.com/, /firebaseio\.com/],
    globals: ["firebase"],
  },

  // Payments
  "Stripe": {
    scripts: [/js\.stripe\.com/],
    globals: ["Stripe"],
  },
  "Braintree": {
    scripts: [/js\.braintreegateway\.com/],
    globals: ["braintree"],
  },
  "PayPal": {
    scripts: [/paypalobjects\.com/, /paypal\.com\/sdk/],
    globals: ["paypal"],
  },
  "Chargebee": {
    scripts: [/js\.chargebee\.com/],
    globals: ["Chargebee"],
  },

  // Error Tracking
  "Sentry": {
    scripts: [/browser\.sentry-cdn\.com/, /sentry\.io/],
    globals: ["Sentry"],
  },
  "Bugsnag": {
    scripts: [/d2wy8f7a9ursnm\.cloudfront\.net/, /bugsnag\.com/],
    globals: ["Bugsnag"],
  },
  "Rollbar": {
    scripts: [/rollbar\.com/],
    globals: ["Rollbar"],
  },
  "Datadog": {
    scripts: [/datadoghq\.com/, /datadog-rum/],
    globals: ["DD_RUM"],
  },

  // A/B Testing & Feature Flags
  "Optimizely": {
    scripts: [/cdn\.optimizely\.com/],
    globals: ["optimizely"],
  },
  "LaunchDarkly": {
    scripts: [/launchdarkly\.com/],
    globals: ["LDClient"],
  },
  "VWO": {
    scripts: [/dev\.visualwebsiteoptimizer\.com/],
    globals: ["_vwo"],
  },
  "Split": {
    scripts: [/cdn\.split\.io/],
  },

  // CDN & Infrastructure
  "Cloudflare": {
    headers: [/cf-ray/i],
    scripts: [/cloudflare\.com/, /cloudflareinsights/],
  },
  "Fastly": {
    headers: [/x-served-by.*cache/i, /fastly/i],
  },
  "Akamai": {
    headers: [/akamai/i],
  },
  "AWS CloudFront": {
    headers: [/x-amz-cf/i, /cloudfront/i],
  },

  // CMS & Website Builders
  "WordPress": {
    meta: [/wp-content/, /wordpress/i],
    scripts: [/wp-includes/, /wp-content/],
  },
  "Webflow": {
    scripts: [/webflow\.com/],
    meta: [/webflow/i],
  },
  "Squarespace": {
    scripts: [/squarespace\.com/],
    meta: [/squarespace/i],
  },
  "Wix": {
    scripts: [/parastorage\.com/, /wix\.com/],
  },
  "Shopify": {
    scripts: [/cdn\.shopify\.com/],
    meta: [/shopify/i],
  },
  "Contentful": {
    scripts: [/contentful\.com/],
  },

  // Communication
  "Slack": {
    dns: [/slack-msgs/, /_dmarc\.slack/],
  },
  "Twilio": {
    scripts: [/twilio\.com/],
  },
  "SendGrid": {
    dns: [/sendgrid/, /em\d+\./],
  },

  // HR & Recruiting
  "Greenhouse": {
    scripts: [/boards\.greenhouse\.io/],
    iframes: [/greenhouse\.io/],
  },
  "Lever": {
    scripts: [/jobs\.lever\.co/],
    iframes: [/lever\.co/],
  },
  "Workday": {
    iframes: [/workday\.com/, /myworkday\.com/],
  },
  "BambooHR": {
    scripts: [/bamboohr\.com/],
    iframes: [/bamboohr/],
  },

  // Project Management
  "Jira": {
    scripts: [/jira\.com/, /atlassian\.com/],
  },
  "Asana": {
    scripts: [/asana\.com/],
  },
  "Monday.com": {
    scripts: [/monday\.com/],
  },
  "Linear": {
    scripts: [/linear\.app/],
  },

  // Video & Meetings
  "Zoom": {
    scripts: [/zoom\.us/],
  },
  "Calendly": {
    scripts: [/calendly\.com/, /assets\.calendly\.com/],
    iframes: [/calendly\.com/],
  },
  "Loom": {
    scripts: [/loom\.com/],
    iframes: [/loom\.com\/embed/],
  },
  "Vidyard": {
    scripts: [/vidyard\.com/],
  },
  "Wistia": {
    scripts: [/wistia\.com/, /wistia\.net/],
  },
  "Vimeo": {
    scripts: [/player\.vimeo\.com/],
    iframes: [/vimeo\.com/],
  },
};

// Product URLs for scoring
const PRODUCT_URLS = {
  "Google Analytics": "https://analytics.google.com",
  "Segment": "https://segment.com",
  "Mixpanel": "https://mixpanel.com",
  "Amplitude": "https://amplitude.com",
  "Heap": "https://heap.io",
  "Hotjar": "https://hotjar.com",
  "FullStory": "https://fullstory.com",
  "Pendo": "https://pendo.io",
  "LogRocket": "https://logrocket.com",
  "Intercom": "https://intercom.com",
  "Zendesk": "https://zendesk.com",
  "Drift": "https://drift.com",
  "Crisp": "https://crisp.chat",
  "Freshdesk": "https://freshdesk.com",
  "HubSpot": "https://hubspot.com",
  "Salesforce": "https://salesforce.com",
  "Marketo": "https://marketo.com",
  "Pardot": "https://pardot.com",
  "Mailchimp": "https://mailchimp.com",
  "Klaviyo": "https://klaviyo.com",
  "Customer.io": "https://customer.io",
  "Braze": "https://braze.com",
  "Auth0": "https://auth0.com",
  "Okta": "https://okta.com",
  "Firebase": "https://firebase.google.com",
  "Stripe": "https://stripe.com",
  "Braintree": "https://braintreepayments.com",
  "PayPal": "https://paypal.com",
  "Chargebee": "https://chargebee.com",
  "Sentry": "https://sentry.io",
  "Bugsnag": "https://bugsnag.com",
  "Rollbar": "https://rollbar.com",
  "Datadog": "https://datadoghq.com",
  "Optimizely": "https://optimizely.com",
  "LaunchDarkly": "https://launchdarkly.com",
  "VWO": "https://vwo.com",
  "Split": "https://split.io",
  "Cloudflare": "https://cloudflare.com",
  "WordPress": "https://wordpress.org",
  "Webflow": "https://webflow.com",
  "Squarespace": "https://squarespace.com",
  "Wix": "https://wix.com",
  "Shopify": "https://shopify.com",
  "Contentful": "https://contentful.com",
  "Slack": "https://slack.com",
  "Twilio": "https://twilio.com",
  "SendGrid": "https://sendgrid.com",
  "Greenhouse": "https://greenhouse.io",
  "Lever": "https://lever.co",
  "Workday": "https://workday.com",
  "BambooHR": "https://bamboohr.com",
  "Jira": "https://atlassian.com/software/jira",
  "Asana": "https://asana.com",
  "Monday.com": "https://monday.com",
  "Linear": "https://linear.app",
  "Zoom": "https://zoom.us",
  "Calendly": "https://calendly.com",
  "Loom": "https://loom.com",
  "Vidyard": "https://vidyard.com",
  "Wistia": "https://wistia.com",
  "Vimeo": "https://vimeo.com",
};

/**
 * Detect SaaS tools from a website
 */
export async function detectFromWebsite(domain) {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const detected = new Map();

  try {
    // Fetch the page
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 15000,
      redirect: "follow",
    });

    const html = await res.text();
    const headers = Object.fromEntries(res.headers);
    const $ = cheerio.load(html);

    // Get all scripts
    const scripts = [];
    $("script[src]").each((_, el) => {
      scripts.push($(el).attr("src"));
    });

    // Get inline scripts
    const inlineScripts = [];
    $("script:not([src])").each((_, el) => {
      inlineScripts.push($(el).html());
    });

    // Get iframes
    const iframes = [];
    $("iframe[src]").each((_, el) => {
      iframes.push($(el).attr("src"));
    });

    // Get meta tags and full HTML for pattern matching
    const metaContent = [];
    $("meta").each((_, el) => {
      const content = $(el).attr("content") || "";
      const name = $(el).attr("name") || "";
      metaContent.push(content, name);
    });

    // Check each fingerprint
    for (const [product, fingerprint] of Object.entries(FINGERPRINTS)) {
      let confidence = 0;
      const evidence = [];

      // Check scripts
      if (fingerprint.scripts) {
        for (const pattern of fingerprint.scripts) {
          for (const src of scripts) {
            if (pattern.test(src)) {
              confidence += 40;
              evidence.push(`script: ${src.slice(0, 60)}`);
              break;
            }
          }
        }
      }

      // Check globals in inline scripts
      if (fingerprint.globals) {
        for (const global of fingerprint.globals) {
          const pattern = new RegExp(`\\b${global}\\b`);
          for (const script of inlineScripts) {
            if (script && pattern.test(script)) {
              confidence += 30;
              evidence.push(`global: ${global}`);
              break;
            }
          }
        }
      }

      // Check meta tags
      if (fingerprint.meta) {
        for (const pattern of fingerprint.meta) {
          for (const content of metaContent) {
            if (pattern.test(content)) {
              confidence += 20;
              evidence.push(`meta: ${content.slice(0, 40)}`);
              break;
            }
          }
        }
      }

      // Check headers
      if (fingerprint.headers) {
        for (const pattern of fingerprint.headers) {
          for (const [key, value] of Object.entries(headers)) {
            if (pattern.test(key) || pattern.test(value)) {
              confidence += 25;
              evidence.push(`header: ${key}`);
              break;
            }
          }
        }
      }

      // Check iframes
      if (fingerprint.iframes) {
        for (const pattern of fingerprint.iframes) {
          for (const src of iframes) {
            if (src && pattern.test(src)) {
              confidence += 35;
              evidence.push(`iframe: ${src.slice(0, 60)}`);
              break;
            }
          }
        }
      }

      if (confidence > 0) {
        detected.set(product, {
          name: product,
          confidence: confidence >= 60 ? "high" : confidence >= 30 ? "medium" : "low",
          score: Math.min(confidence, 100),
          evidence,
          url: PRODUCT_URLS[product] || null,
          source: "website_detection",
        });
      }
    }

    // DNS-based detection
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    await detectFromDNS(hostname, detected);

  } catch (err) {
    console.error(`Detection error for ${domain}:`, err.message);
  }

  return Array.from(detected.values()).sort((a, b) => b.score - a.score);
}

/**
 * Detect tools from DNS records
 */
async function detectFromDNS(domain, detected) {
  try {
    // Check TXT records
    const txtRecords = await resolveTxt(domain).catch(() => []);
    const txtString = txtRecords.flat().join(" ");

    // Check MX records
    const mxRecords = await resolveMx(domain).catch(() => []);
    const mxString = mxRecords.map(r => r.exchange).join(" ");

    // Check CNAME for common subdomains
    const subdomains = ["mail", "email", "support", "help", "status"];
    const cnameResults = [];
    for (const sub of subdomains) {
      try {
        const cnames = await resolveCname(`${sub}.${domain}`);
        cnameResults.push(...cnames);
      } catch {
        // Subdomain doesn't exist, skip
      }
    }
    const cnameString = cnameResults.join(" ");

    const dnsContent = `${txtString} ${mxString} ${cnameString}`;

    for (const [product, fingerprint] of Object.entries(FINGERPRINTS)) {
      if (!fingerprint.dns) continue;

      for (const pattern of fingerprint.dns) {
        if (pattern.test(dnsContent)) {
          const existing = detected.get(product);
          if (existing) {
            existing.score += 20;
            existing.evidence.push("dns_record");
          } else {
            detected.set(product, {
              name: product,
              confidence: "medium",
              score: 30,
              evidence: ["dns_record"],
              url: PRODUCT_URLS[product] || null,
              source: "dns_detection",
            });
          }
          break;
        }
      }
    }

    // Google Workspace
    if (/google|gmail|googlemail/i.test(mxString)) {
      detected.set("Google Workspace", {
        name: "Google Workspace",
        confidence: "high",
        score: 80,
        evidence: ["mx_record"],
        url: "https://workspace.google.com",
        source: "dns_detection",
      });
    }

    // Microsoft 365
    if (/outlook|microsoft/i.test(mxString)) {
      detected.set("Microsoft 365", {
        name: "Microsoft 365",
        confidence: "high",
        score: 80,
        evidence: ["mx_record"],
        url: "https://microsoft.com/microsoft-365",
        source: "dns_detection",
      });
    }

  } catch (err) {
    // DNS errors are expected for some domains
  }
}

/**
 * Get category for a detected product
 */
export function getProductCategory(productName) {
  const categories = {
    Analytics: ["Google Analytics", "Segment", "Mixpanel", "Amplitude", "Heap", "Pendo"],
    "Session Recording": ["Hotjar", "FullStory", "LogRocket"],
    "Customer Support": ["Intercom", "Zendesk", "Drift", "Crisp", "Freshdesk", "HubSpot"],
    "CRM & Marketing": ["Salesforce", "HubSpot", "Marketo", "Pardot", "Mailchimp", "Klaviyo", "Customer.io", "Braze"],
    Authentication: ["Auth0", "Okta", "Firebase"],
    Payments: ["Stripe", "Braintree", "PayPal", "Chargebee"],
    "Error Tracking": ["Sentry", "Bugsnag", "Rollbar", "Datadog"],
    "Feature Flags": ["Optimizely", "LaunchDarkly", "VWO", "Split"],
    Infrastructure: ["Cloudflare", "Fastly", "Akamai", "AWS CloudFront"],
    CMS: ["WordPress", "Webflow", "Squarespace", "Wix", "Shopify", "Contentful"],
    Communication: ["Slack", "Twilio", "SendGrid", "Google Workspace", "Microsoft 365"],
    HR: ["Greenhouse", "Lever", "Workday", "BambooHR"],
    "Project Management": ["Jira", "Asana", "Monday.com", "Linear"],
    Video: ["Zoom", "Calendly", "Loom", "Vidyard", "Wistia", "Vimeo"],
  };

  for (const [category, products] of Object.entries(categories)) {
    if (products.includes(productName)) {
      return category;
    }
  }
  return "Other";
}

export { PRODUCT_URLS };
