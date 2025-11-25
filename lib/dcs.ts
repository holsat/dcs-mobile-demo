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

// Native platforms: These functions are not available and should not be called
// The web platform will use dcs.web.ts via Metro's platform-specific extensions
export async function fetchServiceDates(_year: number): Promise<Set<string>> {
  throw new Error('fetchServiceDates is only available on web platform');
}

export async function fetchServicesForDate(_isoDate: string): Promise<DcsService[]> {
  throw new Error('fetchServicesForDate is only available on web platform');
}

export async function fetchHtml(_url: string): Promise<string> {
  throw new Error('fetchHtml is only available on web platform');
}