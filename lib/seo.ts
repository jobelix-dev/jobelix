export const SITE_NAME = "Jobelix";
export const SITE_TAGLINE = "AI job matching and auto-apply";
export const DEFAULT_DESCRIPTION =
  "Jobelix helps top talent find jobs faster with AI-powered matching and automated applications.";

const DEFAULT_SITE_URL = "https://www.jobelix.fr";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  if (!path) return "/";
  let normalized = path.startsWith("/") ? path : `/${path}`;
  normalized = normalized.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const baseUrl =
    envUrl || (vercelUrl ? `https://${vercelUrl}` : DEFAULT_SITE_URL);
  return stripTrailingSlash(baseUrl);
}

export function canonicalUrl(path = "/") {
  const baseUrl = getSiteUrl();
  const normalized = normalizePath(path);
  if (normalized === "/") return baseUrl;
  return `${baseUrl}${normalized}`;
}

export function defaultOpenGraphImages() {
  const url = new URL("/opengraph-image", getSiteUrl()).toString();
  return [
    {
      url,
      width: 1200,
      height: 630,
      alt: `${SITE_NAME} - ${SITE_TAGLINE}`,
    },
  ];
}

export function defaultTwitterImages() {
  const url = new URL("/twitter-image", getSiteUrl()).toString();
  return [url];
}

export function organizationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
  };
}

export function websiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: SITE_NAME,
    url: siteUrl,
    publisher: {
      "@id": `${siteUrl}/#organization`,
    },
  };
}

export function softwareApplicationJsonLd(options?: {
  urlPath?: string;
  description?: string;
  name?: string;
}) {
  const siteUrl = getSiteUrl();
  const urlPath = options?.urlPath ?? "/";
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: options?.name ?? SITE_NAME,
    url: canonicalUrl(urlPath),
    description: options?.description ?? DEFAULT_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows 10+, macOS 14+, Linux (Ubuntu 22.04+, Arch)",
    publisher: {
      "@id": `${siteUrl}/#organization`,
    },
  };
}
