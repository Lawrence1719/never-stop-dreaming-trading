/**
 * PSGC (Philippine Standard Geographic Code) API Service
 * 
 * Fetches real-time geographical data for the Philippines.
 * API Documentation: https://psgc.gitlab.io/api/
 */

const BASE_URL = 'https://psgc.gitlab.io/api';

// Simple in-memory cache to avoid redundant calls during a session
const cache: Record<string, any> = {};

async function fetchWithCache<T>(url: string): Promise<T> {
  if (cache[url]) {
    return cache[url];
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PSGC API error: ${response.statusText}`);
  }

  const data = await response.json();
  cache[url] = data;
  return data;
}

export interface PSGCRegion {
  code: string;
  name: string;
  regionName: string;
}

export interface PSGCProvince {
  code: string;
  name: string;
  regionCode: string;
}

export interface PSGCCityMunicipality {
  code: string;
  name: string;
  provinceCode: string;
  regionCode: string;
  isCity: boolean;
  isMunicipality: boolean;
}

export interface PSGCBarangay {
  code: string;
  name: string;
  cityCode?: string;
  municipalityCode?: string;
}

/**
 * Get all regions
 */
export async function getRegions(): Promise<PSGCRegion[]> {
  return fetchWithCache<PSGCRegion[]>(`${BASE_URL}/regions/`);
}

/**
 * Get all provinces
 */
export async function getProvinces(): Promise<PSGCProvince[]> {
  return fetchWithCache<PSGCProvince[]>(`${BASE_URL}/provinces/`);
}

/**
 * Get provinces for a specific region
 */
export async function getProvincesByRegion(regionCode: string): Promise<PSGCProvince[]> {
  return fetchWithCache<PSGCProvince[]>(`${BASE_URL}/regions/${regionCode}/provinces/`);
}

/**
 * Get cities and municipalities for a specific province
 */
export async function getCitiesByProvince(provinceCode: string): Promise<PSGCCityMunicipality[]> {
  return fetchWithCache<PSGCCityMunicipality[]>(`${BASE_URL}/provinces/${provinceCode}/cities-municipalities/`);
}

/**
 * Get cities and municipalities for a specific region (useful for NCR)
 */
export async function getCitiesByRegion(regionCode: string): Promise<PSGCCityMunicipality[]> {
  return fetchWithCache<PSGCCityMunicipality[]>(`${BASE_URL}/regions/${regionCode}/cities-municipalities/`);
}

/**
 * Get barangays for a specific city or municipality
 */
export async function getBarangaysByCity(cityCode: string): Promise<PSGCBarangay[]> {
  return fetchWithCache<PSGCBarangay[]>(`${BASE_URL}/cities-municipalities/${cityCode}/barangays/`);
}
