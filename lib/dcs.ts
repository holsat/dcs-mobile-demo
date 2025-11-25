// Type exports (safe for all platforms)
export type DcsServiceResource = {
  label: string;
  url: string;
  language: string;
};

export type DcsService = {
  id: string;
  title: string;
  resources: DcsServiceResource[];
};

const SERVICES_INDEX_URL = 'https://dcs.goarch.org/goa/dcs/servicesindex.html';
const INDEX_BASE_URL = 'https://dcs.goarch.org/goa/dcs/indexes/';

// Native platforms use direct fetch (no CORS issues on React Native)
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return await response.text();
}

function normalizeLanguage(code: string): string {
  const normalized = code.trim().toUpperCase();
  switch (normalized) {
    case 'EN':
      return 'English';
    case 'GR':
      return 'Greek';
    case 'GR-EN':
      return 'Greek-English';
    default:
      return normalized;
  }
}

function toAbsoluteUrl(baseUrl: string, href: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

// Native implementation using regex-only parsing (no cheerio)
export async function fetchServiceDates(year: number): Promise<Set<string>> {
  const html = await fetchHtml(SERVICES_INDEX_URL);
  const matches = html.match(/indexes\/(\d{8})\.html/gi) ?? [];
  const dateSet = new Set<string>();

  for (const match of matches) {
    const dateMatch = match.match(/(\d{8})/);
    if (!dateMatch) continue;
    const digits = dateMatch[1];
    const matchYear = Number(digits.slice(0, 4));
    if (matchYear !== year) continue;
    const month = digits.slice(4, 6);
    const day = digits.slice(6, 8);
    dateSet.add(`${matchYear}-${month}-${day}`);
  }

  return dateSet;
}

export async function fetchServicesForDate(isoDate: string): Promise<DcsService[]> {
  const ymd = isoDate.replace(/-/g, '');
  const pageUrl = `${INDEX_BASE_URL}${ymd}.html`;
  const html = await fetchHtml(pageUrl);

  const services: DcsService[] = [];
  
  // Parse services using regex (native-compatible, no cheerio)
  // Match service headers: <tr class='index-service-day-tr'><td...><span class='index-service-day'>Service Title</span></td></tr>
  const servicePattern = /<tr[^>]*class=['"]index-service-day-tr['"][^>]*>.*?<span[^>]*class=['"]index-service-day['"][^>]*>([^<]+)<\/span>/gi;
  const serviceMatches = Array.from(html.matchAll(servicePattern));

  for (let i = 0; i < serviceMatches.length; i++) {
    const title = serviceMatches[i][1].trim();
    if (!title) continue;

    const resources: DcsServiceResource[] = [];
    
    // Find the start and end positions for this service's resources
    const startPos = serviceMatches[i].index! + serviceMatches[i][0].length;
    const endPos = i < serviceMatches.length - 1 
      ? serviceMatches[i + 1].index! 
      : html.length;
    
    const serviceSection = html.substring(startPos, endPos);

    // Match resource rows within this service section
    // Pattern: <tr class='index-service-language-tr'><td...><span class='index-language'>EN</span></td><td...><a class='index-file-link' href='...'>View</a></td></tr>
    const rowPattern = /<tr[^>]*class=['"]index-service-language-tr['"][^>]*>(.*?)<\/tr>/gis;
    const rows = Array.from(serviceSection.matchAll(rowPattern));

    for (const row of rows) {
      const rowHtml = row[1];
      
      // Extract language from <span class='index-language'>
      const langMatch = rowHtml.match(/<span[^>]*class=['"]index-language['"][^>]*>([^<]+)<\/span>/i);
      if (!langMatch) continue;
      const languageCode = langMatch[1].trim();

      // Extract link with "view" text from <a class='index-file-link'>
      const linkMatch = rowHtml.match(/<a[^>]*class=['"]index-file-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([^<]+)<\/a>/i);
      if (!linkMatch) continue;
      
      const href = linkMatch[1];
      const linkText = linkMatch[2].trim();
      
      // Only include "View" links (not "Print" links)
      if (/view/i.test(linkText)) {
        const absoluteUrl = toAbsoluteUrl(pageUrl, href);
        resources.push({
          label: normalizeLanguage(languageCode),
          url: absoluteUrl,
          language: normalizeLanguage(languageCode),
        });
      }
    }

    if (resources.length > 0) {
      services.push({
        id: `${ymd}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title,
        resources,
      });
    }
  }

  return services;
}

// This function is only used on web platform via dynamic import
export { fetchHtml };