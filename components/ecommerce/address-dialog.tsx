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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getProvinces, getCitiesByProvince, getZipCodesForCity, City } from "@/lib/data/philippines-addresses";
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
  city: string;
  province: string;
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
    city: "",
    province: "",
    zip: "",
    isDefault: false,
  });

  const [provinces] = useState<string[]>(getProvinces());
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [availableZipCodes, setAvailableZipCodes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing existing address
  useEffect(() => {
    if (address) {
      setFormData({
        street: address.street,
        city: address.city,
        province: address.province,
        zip: address.zip,
        isDefault: address.default,
      });
      
      // Load cities for the selected province
      if (address.province) {
        const cities = getCitiesByProvince(address.province);
        setAvailableCities(cities);
        
        // Load zip codes for the selected city
        if (address.city) {
          const zipCodes = getZipCodesForCity(address.city, address.province);
          setAvailableZipCodes(zipCodes);
        }
      }
    } else {
      // Reset form for new address
      setFormData({
        street: "",
        city: "",
        province: "",
        zip: "",
        isDefault: false,
      });
      setAvailableCities([]);
      setAvailableZipCodes([]);
    }
    setErrors({});
  }, [address, open]);

  const handleProvinceChange = (province: string) => {
    setFormData((prev) => ({ ...prev, province, city: "", zip: "" }));
    const cities = getCitiesByProvince(province);
    setAvailableCities(cities);
    setAvailableZipCodes([]);
  };

  const handleCityChange = (city: string) => {
    setFormData((prev) => ({ ...prev, city, zip: "" }));
    const zipCodes = getZipCodesForCity(city, formData.province);
    setAvailableZipCodes(zipCodes);
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

    if (!formData.zip.trim()) {
      newErrors.zip = "ZIP code is required";
    } else if (!/^\d{4}$/.test(formData.zip)) {
      newErrors.zip = "ZIP code must be 4 digits";
    } else if (formData.city && !availableZipCodes.includes(formData.zip)) {
      newErrors.zip = `Invalid ZIP code for ${formData.city}. Valid codes: ${availableZipCodes.slice(0, 5).join(', ')}${availableZipCodes.length > 5 ? '...' : ''}`;
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
              <Select
                value={formData.province}
                onValueChange={handleProvinceChange}
              >
                <SelectTrigger
                  id="province"
                  className={errors.province ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.province && (
                <p className="text-sm text-destructive">{errors.province}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.city}
                onValueChange={handleCityChange}
                disabled={!formData.province}
              >
                <SelectTrigger
                  id="city"
                  className={errors.city ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((city) => (
                    <SelectItem key={city.name} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city}</p>
              )}
            </div>
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
            {availableZipCodes.length > 0 && formData.city && !errors.zip && (
              <p className="text-xs text-muted-foreground">
                Valid ZIP codes for {formData.city}: {availableZipCodes.slice(0, 5).join(', ')}
                {availableZipCodes.length > 5 && ` +${availableZipCodes.length - 5} more`}
              </p>
            )}
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
