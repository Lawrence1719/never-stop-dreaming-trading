import { NextRequest, NextResponse } from 'next/server';
import {
  validateStreetAddress,
  validateCity,
  validateProvince,
  validateFullName,
  validateZipCodeForLocation,
  validatePhoneNumber,
  validateEmail,
} from '@/lib/utils/validation';

/**
 * Server-side address validation endpoint
 * Validates address data to prevent invalid submissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      street,
      city,
      province,
      zip,
    } = body;

    const errors: Record<string, string> = {};
    const isValid: Record<string, boolean> = {};

    // Validate full name
    if (fullName !== undefined) {
      const nameValidation = validateFullName(fullName);
      isValid.fullName = nameValidation.valid;
      if (!nameValidation.valid) {
        errors.fullName = nameValidation.error || 'Invalid full name';
      }
    }

    // Validate email
    if (email !== undefined) {
      isValid.email = validateEmail(email);
      if (!isValid.email) {
        errors.email = 'Invalid email address';
      }
    }

    // Validate phone
    if (phone !== undefined) {
      isValid.phone = validatePhoneNumber(phone);
      if (!isValid.phone) {
        errors.phone = 'Invalid Philippine phone number';
      }
    }

    // Validate street address
    if (street !== undefined) {
      const streetValidation = validateStreetAddress(street);
      isValid.street = streetValidation.valid;
      if (!streetValidation.valid) {
        errors.street = streetValidation.error || 'Invalid street address';
      }
    }

    // Validate city
    if (city !== undefined) {
      const cityValidation = validateCity(city);
      isValid.city = cityValidation.valid;
      if (!cityValidation.valid) {
        errors.city = cityValidation.error || 'Invalid city';
      }
    }

    // Validate province
    if (province !== undefined) {
      const provinceValidation = validateProvince(province);
      isValid.province = provinceValidation.valid;
      if (!provinceValidation.valid) {
        errors.province = provinceValidation.error || 'Invalid province';
      }
    }

    // Validate zip code (with location context if provided)
    if (zip !== undefined) {
      const zipValidation = validateZipCodeForLocation(zip, city, province);
      isValid.zip = zipValidation.valid;
      if (!zipValidation.valid) {
        errors.zip = zipValidation.error || 'Invalid zip code';
      }
    }

    const allValid = Object.values(isValid).every(v => v === true);

    return NextResponse.json({
      valid: allValid,
      isValid,
      errors,
    });
  } catch (error) {
    console.error('Address validation error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}


