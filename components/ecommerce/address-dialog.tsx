"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getProvinces,
  getCitiesByProvince,
  getBarangaysByCity,
  PSGCProvince,
  PSGCCityMunicipality,
  PSGCBarangay
} from "@/lib/services/address.service";
import { getZipCodesForCity } from "@/lib/data/philippines-zip-codes";
import { Address } from "@/lib/types";

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (addressData: AddressFormData) => Promise<void>;
  address?: Address | null;
  isLoading?: boolean;
}

export interface AddressFormData {
  street: string;
  barangay: string;
  barangayCode: string;
  city: string;
  cityCode: string;
  province: string;
  provinceCode: string;
  zip: string;
  isDefault: boolean;
}

export function AddressDialog({
  open,
  onOpenChange,
  onSave,
  address,
  isLoading = false,
}: AddressDialogProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    street: "",
    barangay: "",
    barangayCode: "",
    city: "",
    cityCode: "",
    province: "",
    provinceCode: "",
    zip: "",
    isDefault: false,
  });

  const [geoProvinces, setGeoProvinces] = useState<PSGCProvince[]>([]);
  const [geoCities, setGeoCities] = useState<PSGCCityMunicipality[]>([]);
  const [geoBarangays, setGeoBarangays] = useState<PSGCBarangay[]>([]);
  
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Provinces on mount
  useEffect(() => {
    const fetchProcs = async () => {
      setIsLoadingProvinces(true);
      try {
        const data = await getProvinces();
        setGeoProvinces(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to fetch provinces:", err);
      } finally {
        setIsLoadingProvinces(false);
      }
    };
    fetchProcs();
  }, []);

  // 2. Fetch Cities when Province changes
  useEffect(() => {
    if (!formData.provinceCode) {
      setGeoCities([]);
      return;
    }

    const fetchCitiesArr = async () => {
      setIsLoadingCities(true);
      try {
        const data = await getCitiesByProvince(formData.provinceCode);
        setGeoCities(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to fetch cities:", err);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCitiesArr();
  }, [formData.provinceCode]);

  // 3. Fetch Barangays when City changes
  useEffect(() => {
    if (!formData.cityCode) {
      setGeoBarangays([]);
      return;
    }

    const fetchBrgys = async () => {
      setIsLoadingBarangays(true);
      try {
        const data = await getBarangaysByCity(formData.cityCode);
        setGeoBarangays(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to fetch barangays:", err);
      } finally {
        setIsLoadingBarangays(false);
      }
    };
    fetchBrgys();
  }, [formData.cityCode]);

  // Populate form when editing existing address
  useEffect(() => {
    if (address) {
      setFormData({
        street: address.street,
        barangay: address.barangay || "",
        barangayCode: address.barangayCode || "",
        city: address.city,
        cityCode: address.cityCode || "",
        province: address.province,
        provinceCode: address.provinceCode || "",
        zip: address.zip,
        isDefault: address.default,
      });
    } else {
      // Reset form for new address
      setFormData({
        street: "",
        barangay: "",
        barangayCode: "",
        city: "",
        cityCode: "",
        province: "",
        provinceCode: "",
        zip: "",
        isDefault: false,
      });
    }
    setErrors({});
  }, [address, open]);

  const handleProvinceChange = (code: string) => {
    const province = geoProvinces.find(p => p.code === code)?.name || "";
    setFormData((prev) => ({ 
      ...prev, 
      province, 
      provinceCode: code, 
      city: "", 
      cityCode: "", 
      barangay: "", 
      barangayCode: "", 
      zip: "" 
    }));
    setGeoCities([]);
    setGeoBarangays([]);
  };

  const handleCityChange = (code: string) => {
    const city = geoCities.find(c => c.code === code)?.name || "";
    const suggestedZips = getZipCodesForCity(city);
    const zip = suggestedZips.length > 0 ? suggestedZips[0] : "";
    
    setFormData((prev) => ({ 
      ...prev, 
      city, 
      cityCode: code, 
      barangay: "", 
      barangayCode: "", 
      zip 
    }));
    setGeoBarangays([]);
  };

  const handleBarangayChange = (code: string) => {
    const barangay = geoBarangays.find(b => b.code === code)?.name || "";
    setFormData((prev) => ({ ...prev, barangay, barangayCode: code }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.street.trim()) {
      newErrors.street = "Street address is required";
    }

    if (!formData.province) {
      newErrors.province = "Province is required";
    }

    if (!formData.city) {
      newErrors.city = "City is required";
    }

    if (!formData.barangay) {
      newErrors.barangay = "Barangay is required";
    }

    if (!formData.zip.trim()) {
      newErrors.zip = "ZIP code is required";
    } else if (!/^\d{4}$/.test(formData.zip)) {
      newErrors.zip = "ZIP code must be 4 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{address ? "Edit Address" : "Add New Address"}</DialogTitle>
          <DialogDescription>
            {address
              ? "Update your address details below."
              : "Add a new shipping address to your account."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="street"
              placeholder="123 Main Street, Barangay Name"
              value={formData.street}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, street: e.target.value }))
              }
              className={errors.street ? "border-destructive" : ""}
            />
            {errors.street && (
              <p className="text-sm text-destructive">{errors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="province">
                Province <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={geoProvinces.map(p => ({ value: p.code, label: p.name }))}
                value={formData.provinceCode}
                onValueChange={handleProvinceChange}
                disabled={isLoadingProvinces}
                placeholder={isLoadingProvinces ? "Loading..." : "Select province"}
                searchPlaceholder="Search province..."
                triggerClassName={errors.province ? "border-destructive h-auto py-2" : "h-auto py-2"}
              />
              {errors.province && (
                <p className="text-sm text-destructive">{errors.province}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">
                City / Municipality <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={geoCities.map(c => ({ value: c.code, label: c.name }))}
                value={formData.cityCode}
                onValueChange={handleCityChange}
                disabled={!formData.provinceCode || isLoadingCities}
                placeholder={!formData.provinceCode ? "Select province first" : isLoadingCities ? "Loading..." : "Select city"}
                searchPlaceholder="Search city/municipality..."
                triggerClassName={errors.city ? "border-destructive h-auto py-2" : "h-auto py-2"}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barangay">
                Barangay <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={geoBarangays.map(b => ({ value: b.code, label: b.name }))}
                value={formData.barangayCode}
                onValueChange={handleBarangayChange}
                disabled={!formData.cityCode || isLoadingBarangays}
                placeholder={!formData.cityCode ? "Select city first" : isLoadingBarangays ? "Loading..." : "Select barangay"}
                searchPlaceholder="Search barangay..."
                triggerClassName={errors.barangay ? "border-destructive h-auto py-2" : "h-auto py-2"}
              />
              {errors.barangay && (
                <p className="text-sm text-destructive">{errors.barangay}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">
                ZIP Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="zip"
                placeholder="1630"
                maxLength={4}
                value={formData.zip}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData((prev) => ({ ...prev, zip: value }));
                }}
                className={errors.zip ? "border-destructive" : ""}
                disabled={!formData.city}
              />
              {errors.zip && (
                <p className="text-sm text-destructive">{errors.zip}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isDefault: checked as boolean }))
              }
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              Set as default address
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : address ? "Update Address" : "Add Address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
