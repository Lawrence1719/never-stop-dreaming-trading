/**
 * PSGC (Philippine Standard Geographic Code) API Service
 *
 * Fetches real-time geographical data for the Philippines.
 * Primary:  https://psgc.cloud/api
 * Fallback: https://psgc.gitlab.io/api
 *
 * Both APIs are tried in order — if the primary is down or returns
 * an error, the service automatically retries against the fallback.
 */

const API_SOURCES = [
  "https://psgc.cloud/api",
  "https://psgc.gitlab.io/api",
];

// In-memory cache to avoid redundant calls during a session
const cache: Record<string, unknown> = {};

// ---------------------------------------------------------------------------
// Core fetcher — retries per source, then falls over to the next source
// ---------------------------------------------------------------------------

async function fetchFromSource<T>(url: string, retries = 2): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        // Back off and retry on rate-limit
        if (response.status === 429 && attempt < retries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw new Error(
          `PSGC API error: ${response.status} ${response.statusText || "Unknown Error"} — ${url}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = toError(error);
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error(`Failed after ${retries + 1} attempts: ${url}`);
}

async function fetchWithCache<T>(path: string): Promise<T> {
  // Return from cache if available (keyed by path, not full URL)
  if (cache[path]) return cache[path] as T;

  let lastError: Error | null = null;

  for (const base of API_SOURCES) {
    const url = `${base}${path}`;
    try {
      const data = await fetchFromSource<T>(url);
      cache[path] = data;
      return data;
    } catch (error) {
      lastError = toError(error);
      console.warn(`[address.service] Source failed, trying next: ${url}`);
    }
  }

  throw lastError ?? new Error(`All PSGC API sources failed for path: ${path}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** Clear the in-memory cache (useful in tests or after long sessions) */
export function clearAddressCache(): void {
  Object.keys(cache).forEach((key) => delete cache[key]);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// API functions
// Note: psgc.cloud requires the .json suffix on all endpoints.
//       psgc.gitlab.io also accepts it, so we always include it.
// ---------------------------------------------------------------------------

/** Get all provinces */
export async function getProvinces(): Promise<PSGCProvince[]> {
  return fetchWithCache<PSGCProvince[]>("/provinces.json");
}

/** Get cities and municipalities for a specific province */
export async function getCitiesByProvince(
  provinceCode: string
): Promise<PSGCCityMunicipality[]> {
  if (!provinceCode) throw new Error("provinceCode is required");
  return fetchWithCache<PSGCCityMunicipality[]>(
    `/provinces/${provinceCode}/cities-municipalities.json`
  );
}

/** Get barangays for a specific city or municipality */
export async function getBarangaysByCity(
  cityCode: string
): Promise<PSGCBarangay[]> {
  if (!cityCode) throw new Error("cityCode is required");
  return fetchWithCache<PSGCBarangay[]>(
    `/cities-municipalities/${cityCode}/barangays.json`
  );
}

// ---------------------------------------------------------------------------
// Lookup helpers (find code by name, with fuzzy normalization)
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/city of /g, "")
    .replace(/ city/g, "")
    .replace(/municipality of /g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Find a province code by name (case-insensitive, strips "City of" etc.) */
export async function findProvinceByName(name: string): Promise<string | null> {
  const provinces = await getProvinces();
  const normalized = normalizeName(name);
  return provinces.find((p) => normalizeName(p.name) === normalized)?.code ?? null;
}

/** Find a city code by name within a province */
export async function findCityByName(
  provinceCode: string,
  name: string
): Promise<string | null> {
  const cities = await getCitiesByProvince(provinceCode);
  const normalized = normalizeName(name);
  return cities.find((c) => normalizeName(c.name) === normalized)?.code ?? null;
}

/** Find a barangay code by name within a city */
export async function findBarangayByName(
  cityCode: string,
  name: string
): Promise<string | null> {
  const barangays = await getBarangaysByCity(cityCode);
  const normalized = normalizeName(name);
  return barangays.find((b) => normalizeName(b.name) === normalized)?.code ?? null;
}