import * as cheerio from 'cheerio';
import {
  getServicesIndexKey,
  getDateIndexKey,
  getServiceContentKey,
  getWithRevalidate,
  TTL,
} from './cache';

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
const CORS_PROXIES: Array<(url: string) => string> = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

function toAbsoluteUrl(baseUrl: string, href: string | undefined): string | null {
  if (!href) return null;
  try {
    // The DCS index pages have <base href='../'/> 
    // So we need to resolve relative URLs from the parent directory
    // baseUrl example: https://dcs.goarch.org/goa/dcs/indexes/20251125.html
    // We need: https://dcs.goarch.org/goa/dcs/
    const baseUrlObj = new URL(baseUrl);
    const pathParts = baseUrlObj.pathname.split('/');
    // Remove the file name and the 'indexes' directory
    pathParts.pop(); // Remove '20251125.html'
    pathParts.pop(); // Remove 'indexes'
    baseUrlObj.pathname = pathParts.join('/') + '/';
    
    return new URL(href, baseUrlObj.toString()).toString();
  } catch (error) {
    return null;
  }
}

export async function fetchHtml(url: string): Promise<string> {
  const urlsToTry = [...CORS_PROXIES.map((wrap) => wrap(url)), url];
  let lastError: unknown;

  for (const target of urlsToTry) {
    try {
      const response = await fetch(target);
      if (!response.ok) {
        lastError = new Error(`Request failed with status ${response.status}`);
        continue;
      }
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch remote content');
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

// Helper to parse service dates from HTML
function parseServiceDatesFromHtml(html: string, year: number): Set<string> {
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

  // Fallback: parse anchors with cheerio in case regex misses some
  const $ = cheerio.load(html);
  $('a.index-day-link').each((_, element) => {
    const href = $(element).attr('href');
    const match = href?.match(/(\d{4})(\d{2})(\d{2})/);
    if (!match) return;
    const [, y, m, d] = match;
    if (Number(y) === year) {
      dateSet.add(`${y}-${m}-${d}`);
    }
  });

  return dateSet;
}

// Phase 1: Services Index Caching with Stale-While-Revalidate
export async function fetchServiceDates(year: number): Promise<Set<string>> {
  const cacheKey = getServicesIndexKey(year);
  
  // Use stale-while-revalidate pattern
  const dates = await getWithRevalidate(
    cacheKey,
    async () => {
      console.log(`📡 Fetching services index for year ${year}...`);
      const html = await fetchHtml(SERVICES_INDEX_URL);
      const dateSet = parseServiceDatesFromHtml(html, year);
      return Array.from(dateSet); // Convert Set to Array for JSON serialization
    },
    TTL.ONE_DAY, // Cache for 24 hours
    false // Use AsyncStorage (small data)
  );
  
  return new Set(dates);
}

// Helper to parse services from HTML
function parseServicesFromHtml(html: string, isoDate: string, pageUrl: string): DcsService[] {
  const ymd = isoDate.replace(/-/g, '');
  const $ = cheerio.load(html);
  const services: DcsService[] = [];

  $('.index-service-day').each((_, element) => {
    const title = $(element).text().trim();
    if (!title) return;

    const serviceRow = $(element).closest('tr');
    // Resources are the subsequent rows until the next service header
    const resources: DcsServiceResource[] = [];
    let row = serviceRow.next();

    while (row.length) {
      if (row.find('.index-service-day').length) break;

      const languageCode = row.find('.index-language').first().text().trim();
      const link = row.find('.index-file-link').first();
      const linkLabel = link.text().trim();

      if (/view/i.test(linkLabel)) {
        const absoluteUrl = toAbsoluteUrl(pageUrl, link.attr('href'));
        if (absoluteUrl) {
          resources.push({
            label: normalizeLanguage(languageCode),
            url: absoluteUrl,
            language: normalizeLanguage(languageCode),
          });
        }
      }

      row = row.next();
    }

    if (resources.length) {
      services.push({
        id: `${ymd}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title,
        resources,
      });
    }
  });

  return services;
}

// Phase 2: Date Index Pages Caching with Stale-While-Revalidate
export async function fetchServicesForDate(isoDate: string): Promise<DcsService[]> {
  const cacheKey = getDateIndexKey(isoDate);
  const ymd = isoDate.replace(/-/g, '');
  const pageUrl = `${INDEX_BASE_URL}${ymd}.html`;
  
  // Determine TTL based on date
  const dateObj = new Date(isoDate);
  const now = new Date();
  const isPastDate = dateObj < now;
  
  // Past dates rarely change, cache longer
  const ttl = isPastDate ? TTL.ONE_MONTH : TTL.ONE_WEEK;
  
  // Use stale-while-revalidate pattern
  const services = await getWithRevalidate(
    cacheKey,
    async () => {
      console.log(`📡 Fetching services for date ${isoDate}...`);
      const html = await fetchHtml(pageUrl);
      return parseServicesFromHtml(html, isoDate, pageUrl);
    },
    ttl,
    false // Use AsyncStorage (small data)
  );
  
  return services;
}
