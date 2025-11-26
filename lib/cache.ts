/**
 * Multi-layer caching system for DCS content
 * 
 * Architecture:
 * - Memory Cache: Fastest, session-only
 * - AsyncStorage: Persistent key-value storage for metadata and small content
 * - FileSystem: Persistent storage for large HTML files and assets
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';

// ==================== TYPES ====================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

export interface CacheStats {
  asyncStorageSize: number;
  fileSystemSize: number;
  entryCount: number;
  oldestEntry?: number;
  newestEntry?: number;
}

// ==================== CONSTANTS ====================

const CACHE_PREFIX = 'dcs:cache:';
const CACHE_DIR = `${FileSystem.cacheDirectory}dcs/`;
const CACHE_METADATA_KEY = `${CACHE_PREFIX}metadata`;

// TTL Constants (in milliseconds)
export const TTL = {
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  THREE_MONTHS: 90 * 24 * 60 * 60 * 1000,
  PERMANENT: Number.MAX_SAFE_INTEGER,
};

// ==================== MEMORY CACHE ====================

const memoryCache = new Map<string, CacheEntry<any>>();

// ==================== INITIALIZATION ====================

/**
 * Initialize the cache system (create directories)
 */
export async function initCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      console.log('✅ Cache directory created:', CACHE_DIR);
    }
  } catch (error) {
    console.error('Failed to initialize cache:', error);
  }
}

// ==================== NETWORK STATUS ====================

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected === true && networkState.isInternetReachable === true;
  } catch (error) {
    console.error('Failed to check network status:', error);
    return true; // Assume online if check fails
  }
}

// ==================== CACHE KEY HELPERS ====================

/**
 * Generate a cache key for services index
 */
export function getServicesIndexKey(year: number): string {
  return `${CACHE_PREFIX}services-index:${year}`;
}

/**
 * Generate a cache key for a date index page
 */
export function getDateIndexKey(isoDate: string): string {
  return `${CACHE_PREFIX}date-index:${isoDate}`;
}

/**
 * Generate a cache key for service content
 */
export function getServiceContentKey(serviceId: string, language: string): string {
  return `${CACHE_PREFIX}service:${serviceId}:${language}`;
}

/**
 * Generate a file path for large content
 */
function getFilePath(key: string): string {
  // Convert key to safe filename
  const safeName = key.replace(/[^a-z0-9-:]/gi, '_');
  return `${CACHE_DIR}${safeName}.cache`;
}

/**
 * Generate a hash for asset URLs
 */
function hashUrl(url: string): string {
  // Simple hash function for URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function getAssetKey(url: string): string {
  return `${CACHE_PREFIX}asset:${hashUrl(url)}`;
}

// ==================== CORE CACHE FUNCTIONS ====================

/**
 * Check if a cache entry is stale (expired)
 */
export function isStale<T>(entry: CacheEntry<T>): boolean {
  const age = Date.now() - entry.timestamp;
  return age > entry.ttl;
}

/**
 * Get data from memory cache
 */
function getFromMemory<T>(key: string): CacheEntry<T> | null {
  return memoryCache.get(key) || null;
}

/**
 * Set data in memory cache
 */
function setInMemory<T>(key: string, data: T, ttl: number): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    key,
  });
}

/**
 * Get data from AsyncStorage
 */
async function getFromAsyncStorage<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json) as CacheEntry<T>;
  } catch (error) {
    console.error(`Failed to read from AsyncStorage: ${key}`, error);
    return null;
  }
}

/**
 * Set data in AsyncStorage
 */
async function setInAsyncStorage<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error(`Failed to write to AsyncStorage: ${key}`, error);
  }
}

/**
 * Get data from FileSystem
 */
async function getFromFileSystem(key: string): Promise<CacheEntry<string> | null> {
  try {
    const filePath = getFilePath(key);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    if (!fileInfo.exists) return null;
    
    const content = await FileSystem.readAsStringAsync(filePath);
    const lines = content.split('\n');
    
    if (lines.length < 3) return null;
    
    const timestamp = parseInt(lines[0], 10);
    const ttl = parseInt(lines[1], 10);
    const data = lines.slice(2).join('\n');
    
    return {
      data,
      timestamp,
      ttl,
      key,
    };
  } catch (error) {
    console.error(`Failed to read from FileSystem: ${key}`, error);
    return null;
  }
}

/**
 * Set data in FileSystem
 */
async function setInFileSystem(key: string, data: string, ttl: number): Promise<void> {
  try {
    const filePath = getFilePath(key);
    const timestamp = Date.now();
    const content = `${timestamp}\n${ttl}\n${data}`;
    await FileSystem.writeAsStringAsync(filePath, content);
  } catch (error) {
    console.error(`Failed to write to FileSystem: ${key}`, error);
  }
}

// ==================== PUBLIC API ====================

/**
 * Get data from cache (checks memory -> AsyncStorage -> FileSystem)
 */
export async function getCache<T>(key: string, useFileSystem = false): Promise<CacheEntry<T> | null> {
  // 1. Try memory cache first (fastest)
  let entry = getFromMemory<T>(key);
  if (entry) {
    console.log(`✅ Cache HIT (memory): ${key}`);
    return entry;
  }
  
  // 2. Try AsyncStorage or FileSystem
  if (useFileSystem) {
    entry = await getFromFileSystem(key) as CacheEntry<T> | null;
    if (entry) {
      console.log(`✅ Cache HIT (filesystem): ${key}`);
      // Promote to memory cache
      setInMemory(key, entry.data, entry.ttl);
      return entry;
    }
  } else {
    entry = await getFromAsyncStorage<T>(key);
    if (entry) {
      console.log(`✅ Cache HIT (storage): ${key}`);
      // Promote to memory cache
      setInMemory(key, entry.data, entry.ttl);
      return entry;
    }
  }
  
  console.log(`❌ Cache MISS: ${key}`);
  return null;
}

/**
 * Set data in cache
 */
export async function setCache<T>(
  key: string, 
  data: T, 
  ttl: number, 
  useFileSystem = false
): Promise<void> {
  // Always set in memory
  setInMemory(key, data, ttl);
  
  // Set in persistent storage
  if (useFileSystem) {
    if (typeof data === 'string') {
      await setInFileSystem(key, data, ttl);
      console.log(`💾 Cached to filesystem: ${key}`);
    } else {
      console.warn(`Cannot cache non-string data to filesystem: ${key}`);
    }
  } else {
    await setInAsyncStorage(key, data, ttl);
    console.log(`💾 Cached to storage: ${key}`);
  }
}

/**
 * Remove data from cache
 */
export async function removeCache(key: string): Promise<void> {
  // Remove from memory
  memoryCache.delete(key);
  
  // Remove from AsyncStorage
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove from AsyncStorage: ${key}`, error);
  }
  
  // Remove from FileSystem
  try {
    const filePath = getFilePath(key);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
    }
  } catch (error) {
    console.error(`Failed to remove from FileSystem: ${key}`, error);
  }
  
  console.log(`🗑️ Removed from cache: ${key}`);
}

/**
 * Clear all cache data
 */
export async function clearCache(): Promise<void> {
  // Clear memory
  memoryCache.clear();
  
  // Clear AsyncStorage (only DCS cache keys)
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    console.log(`🗑️ Cleared ${cacheKeys.length} keys from AsyncStorage`);
  } catch (error) {
    console.error('Failed to clear AsyncStorage:', error);
  }
  
  // Clear FileSystem cache directory
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      console.log('🗑️ Cleared FileSystem cache');
    }
  } catch (error) {
    console.error('Failed to clear FileSystem:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  let asyncStorageSize = 0;
  let fileSystemSize = 0;
  let entryCount = 0;
  let oldestEntry: number | undefined;
  let newestEntry: number | undefined;
  
  try {
    // Get AsyncStorage size
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    entryCount = cacheKeys.length;
    
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        asyncStorageSize += value.length;
        try {
          const entry = JSON.parse(value);
          if (entry.timestamp) {
            if (!oldestEntry || entry.timestamp < oldestEntry) {
              oldestEntry = entry.timestamp;
            }
            if (!newestEntry || entry.timestamp > newestEntry) {
              newestEntry = entry.timestamp;
            }
          }
        } catch {}
      }
    }
    
    // Get FileSystem size
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      entryCount += files.length;
      
      for (const file of files) {
        const filePath = `${CACHE_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && 'size' in fileInfo) {
          fileSystemSize += fileInfo.size || 0;
        }
      }
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error);
  }
  
  return {
    asyncStorageSize,
    fileSystemSize,
    entryCount,
    oldestEntry,
    newestEntry,
  };
}

/**
 * Stale-While-Revalidate pattern
 * Returns cached data immediately if available, then optionally refreshes in background
 */
export async function getWithRevalidate<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number,
  useFileSystem = false
): Promise<T> {
  const cached = await getCache<T>(key, useFileSystem);
  
  if (cached) {
    // Return cached data immediately
    const data = cached.data;
    
    // Check if stale and revalidate in background
    if (isStale(cached)) {
      console.log(`🔄 Revalidating stale cache: ${key}`);
      
      // Don't await - run in background
      fetchFn()
        .then(freshData => {
          // Only update if data changed
          if (JSON.stringify(freshData) !== JSON.stringify(data)) {
            setCache(key, freshData, ttl, useFileSystem);
            console.log(`✅ Updated cache after revalidation: ${key}`);
          }
        })
        .catch(error => {
          console.log(`⚠️ Revalidation failed, keeping stale cache: ${key}`, error);
        });
    }
    
    return data;
  }
  
  // No cache - fetch and wait
  console.log(`📡 Fetching fresh data: ${key}`);
  const data = await fetchFn();
  await setCache(key, data, ttl, useFileSystem);
  return data;
}

// ==================== ASSET CACHING (PHASE 4) ====================

/**
 * Extract all asset URLs from HTML content (images, audio)
 */
export function extractAssetUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  
  // Match img src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(resolveUrl(match[1], baseUrl));
  }
  
  // Match audio src attributes
  const audioRegex = /<audio[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/gi;
  while ((match = audioRegex.exec(html)) !== null) {
    urls.push(resolveUrl(match[1], baseUrl));
  }
  
  // Match background images in style attributes
  const bgImgRegex = /style=["'][^"']*background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgImgRegex.exec(html)) !== null) {
    urls.push(resolveUrl(match[1], baseUrl));
  }
  
  return [...new Set(urls)]; // Remove duplicates
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Protocol-relative
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  // Absolute path
  if (url.startsWith('/')) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${url}`;
  }
  
  // Relative path
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  return base + url;
}

/**
 * Cache an asset (image, audio, etc.)
 */
export async function cacheAsset(url: string, ttl: number = TTL.THREE_MONTHS): Promise<string> {
  const key = getAssetKey(url);
  
  // Check if already cached
  const cached = await getCache<string>(key);
  if (cached) {
    console.log(`✅ Asset already cached: ${url}`);
    return cached;
  }
  
  try {
    console.log(`📥 Downloading asset: ${url}`);
    
    // Get file extension from URL
    const extension = url.split('.').pop()?.split('?')[0] || 'dat';
    const fileName = `asset_${hashUrl(url)}.${extension}`;
    const filePath = `${CACHE_DIR}${fileName}`;
    
    // Download to file system
    const downloadResult = await FileSystem.downloadAsync(url, filePath);
    
    if (downloadResult.status === 200) {
      // Store file path in cache
      await setCache(key, filePath, ttl, false);
      console.log(`✅ Asset cached: ${url} -> ${filePath}`);
      return filePath;
    } else {
      console.error(`❌ Failed to download asset: ${url} (status: ${downloadResult.status})`);
      return url; // Return original URL on failure
    }
  } catch (error) {
    console.error(`❌ Error caching asset: ${url}`, error);
    return url; // Return original URL on error
  }
}

/**
 * Pre-fetch and cache all assets in HTML content
 * Returns a map of original URL -> cached file path
 */
export async function cacheHtmlAssets(
  html: string,
  baseUrl: string,
  maxConcurrent: number = 3
): Promise<Map<string, string>> {
  const assetUrls = extractAssetUrls(html, baseUrl);
  const assetMap = new Map<string, string>();
  
  if (assetUrls.length === 0) {
    return assetMap;
  }
  
  console.log(`📦 Pre-fetching ${assetUrls.length} assets...`);
  
  // Process assets in batches to avoid overwhelming the network
  for (let i = 0; i < assetUrls.length; i += maxConcurrent) {
    const batch = assetUrls.slice(i, i + maxConcurrent);
    const results = await Promise.allSettled(
      batch.map(url => cacheAsset(url))
    );
    
    results.forEach((result, index) => {
      const originalUrl = batch[index];
      if (result.status === 'fulfilled') {
        assetMap.set(originalUrl, result.value);
      } else {
        console.error(`Failed to cache asset: ${originalUrl}`, result.reason);
        assetMap.set(originalUrl, originalUrl); // Keep original URL
      }
    });
  }
  
  console.log(`✅ Cached ${assetMap.size}/${assetUrls.length} assets`);
  return assetMap;
}

/**
 * Replace asset URLs in HTML with cached file paths (for native platforms)
 */
export function replaceAssetUrls(html: string, assetMap: Map<string, string>): string {
  let modifiedHtml = html;
  
  assetMap.forEach((cachedPath, originalUrl) => {
    // Only replace if we have a local file path
    if (cachedPath.startsWith('file://') || cachedPath.includes(CACHE_DIR)) {
      // Escape special regex characters in URL
      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedUrl, 'g');
      modifiedHtml = modifiedHtml.replace(regex, cachedPath);
    }
  });
  
  return modifiedHtml;
}
