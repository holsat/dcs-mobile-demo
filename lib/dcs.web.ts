import * as cheerio from 'cheerio';

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
    return new URL(href, baseUrl).toString();
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

export async function fetchServicesForDate(isoDate: string): Promise<DcsService[]> {
  const ymd = isoDate.replace(/-/g, '');
  const pageUrl = `${INDEX_BASE_URL}${ymd}.html`;

  const html = await fetchHtml(pageUrl);
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
