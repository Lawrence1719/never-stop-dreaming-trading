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
import { usePhilippineAddress } from "@/lib/hooks/use-philippine-address";
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
  const {
    provinces, loadingProvinces,
    cities, loadingCities,
    barangays, loadingBarangays,
    selectedProvince, setSelectedProvince,
    selectedCity, setSelectedCity,
    selectedBarangay, setSelectedBarangay,
    provinceName, cityName, barangayName,
    zipCode: autoZipCode
  } = usePhilippineAddress({
    provinceCode: address?.provinceCode,
    cityCode: address?.cityCode,
    barangayCode: address?.barangayCode,
    zipCode: address?.zip
  });

  const [formData, setFormData] = useState<AddressFormData>({
    street: address?.street || "",
    barangay: address?.barangay || "",
    barangayCode: address?.barangayCode || "",
    city: address?.city || "",
    cityCode: address?.cityCode || "",
    province: address?.province || "",
    provinceCode: address?.provinceCode || "",
    zip: address?.zip || "",
    isDefault: address?.default || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync hook state with formData
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      province: provinceName,
      provinceCode: selectedProvince,
      city: cityName,
      cityCode: selectedCity,
      barangay: barangayName,
      barangayCode: selectedBarangay,
      zip: autoZipCode || prev.zip
    }));
  }, [selectedProvince, selectedCity, selectedBarangay, provinceName, cityName, barangayName, autoZipCode]);

  // Populate form when editing existing address (only when it changes from outside)
  useEffect(() => {
    if (address && open) {
      setSelectedProvince(address.provinceCode || "");
      setSelectedCity(address.cityCode || "");
      setSelectedBarangay(address.barangayCode || "");
      setFormData(prev => ({
        ...prev,
        street: address.street,
        isDefault: address.default,
        zip: address.zip
      }));
    } else if (!address && open) {
      // Reset for new address
      setSelectedProvince("");
      setSelectedCity("");
      setSelectedBarangay("");
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
  }, [address, open, setSelectedProvince, setSelectedCity, setSelectedBarangay]);

  const handleProvinceChange = (code: string) => {
    setSelectedProvince(code);
  };

  const handleCityChange = (code: string) => {
    setSelectedCity(code);
  };

  const handleBarangayChange = (code: string) => {
    setSelectedBarangay(code);
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
                options={provinces.map(p => ({ value: p.code, label: p.name }))}
                value={formData.provinceCode}
                onValueChange={handleProvinceChange}
                disabled={loadingProvinces}
                placeholder={loadingProvinces ? "Loading..." : "Select province"}
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
                options={cities.map(c => ({ value: c.code, label: c.name }))}
                value={formData.cityCode}
                onValueChange={handleCityChange}
                disabled={!formData.provinceCode || loadingCities}
                placeholder={!formData.provinceCode ? "Select province first" : loadingCities ? "Loading..." : "Select city"}
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
                options={barangays.map(b => ({ value: b.code, label: b.name }))}
                value={formData.barangayCode}
                onValueChange={handleBarangayChange}
                disabled={!formData.cityCode || loadingBarangays}
                placeholder={!formData.cityCode ? "Select city first" : loadingBarangays ? "Loading..." : "Select barangay"}
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
                value={formData.zip}
                onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                className={errors.zip ? "border-destructive" : ""}
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
