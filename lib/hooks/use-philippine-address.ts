import { useState, useEffect, useCallback } from "react";
import {
  getProvinces,
  getCitiesByProvince,
  getBarangaysByCity,
  PSGCProvince,
  PSGCCityMunicipality,
  PSGCBarangay,
} from "@/lib/services/address.service";

export interface AddressState {
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  barangayCode: string;
  barangayName: string;
  zipCode: string;
}

export function usePhilippineAddress(initialState?: Partial<AddressState>) {
  const [provinces, setProvinces] = useState<PSGCProvince[]>([]);
  const [cities, setCities] = useState<PSGCCityMunicipality[]>([]);
  const [barangays, setBarangays] = useState<PSGCBarangay[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState<string>(initialState?.provinceCode || "");
  const [selectedCity, setSelectedCity] = useState<string>(initialState?.cityCode || "");
  const [selectedBarangay, setSelectedBarangay] = useState<string>(initialState?.barangayCode || "");
  const [zipCode, setZipCode] = useState<string>(initialState?.zipCode || "");

  // Fetch all provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const data = await getProvinces();
        setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to fetch provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch cities when province changes
  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const data = await getCitiesByProvince(selectedProvince);
        setCities(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to fetch cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [selectedProvince]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (!selectedCity) {
      setBarangays([]);
      return;
    }

    const fetchBarangays = async () => {
      setLoadingBarangays(true);
      try {
        const data = await getBarangaysByCity(selectedCity);
        setBarangays(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to fetch barangays:", error);
      } finally {
        setLoadingBarangays(false);
      }
    };
    fetchBarangays();

    // Auto-fill zip code from city
    const city = cities.find((c) => c.code === selectedCity);
    if (city) {
      setZipCode(city.zip_code || "");
    }
  }, [selectedCity, cities]);

  const handleSetProvince = useCallback((code: string) => {
    setSelectedProvince(code);
    setSelectedCity("");
    setSelectedBarangay("");
    setBarangays([]);
    setZipCode("");
  }, []);

  const handleSetCity = useCallback((code: string) => {
    setSelectedCity(code);
    setSelectedBarangay("");
    
    // Zip code is updated in the useEffect above once cities are loaded/matched
  }, []);

  const handleSetBarangay = useCallback((code: string) => {
    setSelectedBarangay(code);
  }, []);

  // Helpers to get names
  const provinceName = provinces.find(p => p.code === selectedProvince)?.name || "";
  const cityName = cities.find(c => c.code === selectedCity)?.name || "";
  const barangayName = barangays.find(b => b.code === selectedBarangay)?.name || "";

  return {
    provinces,
    loadingProvinces,
    cities,
    loadingCities,
    barangays,
    loadingBarangays,
    selectedProvince,
    setSelectedProvince: handleSetProvince,
    selectedCity,
    setSelectedCity: handleSetCity,
    selectedBarangay,
    setSelectedBarangay: handleSetBarangay,
    provinceName,
    cityName,
    barangayName,
    zipCode,
    setZipCode,
  };
}
