'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { STORE_CONTACT } from '@/lib/store-contact';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

const cartoAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Leaflet needs a real layout box; % height + dynamic import can resolve before the pane exists (appendChild on undefined). */
const MAP_HEIGHT_PX = 400;

export default function MapComponent() {
  const [domReady, setDomReady] = useState(false);
  const position: [number, number] = [STORE_CONTACT.latitude, STORE_CONTACT.longitude];
  const zoom = Number.isFinite(STORE_CONTACT.mapZoom) ? STORE_CONTACT.mapZoom : 17;

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) setDomReady(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  if (!domReady) {
    return (
      <div
        className="w-full rounded-[12px] bg-muted/40 animate-pulse"
        style={{ height: MAP_HEIGHT_PX }}
        aria-hidden
      />
    );
  }

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      scrollWheelZoom
      className="z-0 w-full rounded-[12px]"
      style={{ height: MAP_HEIGHT_PX, width: '100%' }}
    >
      <TileLayer
        attribution={cartoAttribution}
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <Marker position={position}>
        <Popup>
          <div className="min-w-[200px] space-y-1 text-sm text-neutral-900">
            <p className="font-semibold">{STORE_CONTACT.storeName}</p>
            <p className="text-xs text-neutral-600">
              {STORE_CONTACT.listingName} · {STORE_CONTACT.listingCategory}
            </p>
            <p className="leading-snug">{STORE_CONTACT.address}</p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-neutral-700">
              {STORE_CONTACT.hoursWeekdayLabel}: {STORE_CONTACT.hoursWeekdayTime}
              {'\n'}
              {STORE_CONTACT.hoursWeekendLabel}: {STORE_CONTACT.hoursWeekendTime}
            </p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
