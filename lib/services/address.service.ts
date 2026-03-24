/**
 * PSGC (Philippine Standard Geographic Code) API Service
 * 
 * Fetches real-time geographical data for the Philippines.
 * API Documentation: https://psgc.cloud/api
 */

const BASE_URL = 'https://psgc.cloud/api';

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

export interface PSGCProvince {
  code: string;
  name: string;
}

export interface PSGCCityMunicipality {
  code: string;
  name: string;
  zip_code: string;
  type: string;
}

export interface PSGCBarangay {
  code: string;
  name: string;
}

/**
 * Get all provinces
 */
export async function getProvinces(): Promise<PSGCProvince[]> {
  return fetchWithCache<PSGCProvince[]>(`${BASE_URL}/provinces`);
}

/**
 * Get cities and municipalities for a specific province
 */
export async function getCitiesByProvince(provinceCode: string): Promise<PSGCCityMunicipality[]> {
  return fetchWithCache<PSGCCityMunicipality[]>(`${BASE_URL}/provinces/${provinceCode}/cities-municipalities`);
}

/**
 * Get barangays for a specific city or municipality
 */
export async function getBarangaysByCity(cityCode: string): Promise<PSGCBarangay[]> {
  return fetchWithCache<PSGCBarangay[]>(`${BASE_URL}/cities-municipalities/${cityCode}/barangays`);
}

/**
 * Normalizes a name for comparison
 */
function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/city of /g, '')
    .replace(/ city/g, '')
    .replace(/municipality of /g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Find a province code by name
 */
export async function findProvinceByName(name: string): Promise<string | null> {
  const provinces = await getProvinces();
  const normalizedSearch = normalizeName(name);
  const match = provinces.find(p => normalizeName(p.name) === normalizedSearch);
  return match ? match.code : null;
}

/**
 * Find a city code by name within a province
 */
export async function findCityByName(provinceCode: string, name: string): Promise<string | null> {
  const cities = await getCitiesByProvince(provinceCode);
  const normalizedSearch = normalizeName(name);
  const match = cities.find(c => normalizeName(c.name) === normalizedSearch);
  return match ? match.code : null;
}

/**
 * Find a barangay code by name within a city
 */
export async function findBarangayByName(cityCode: string, name: string): Promise<string | null> {
  const barangays = await getBarangaysByCity(cityCode);
  const normalizedSearch = normalizeName(name);
  const match = barangays.find(b => normalizeName(b.name) === normalizedSearch);
  return match ? match.code : null;
}

