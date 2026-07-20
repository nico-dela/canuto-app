/** Helpers for opening Google Maps directions from Canuto. */

export type MapsCoords = { lat: number; lng: number };

export type DirectionsTarget = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
};

/**
 * Builds a Google Maps directions URL with origin + destination.
 * Omits `travelmode` so the user picks walking / driving / transit in Maps.
 */
export function buildGoogleMapsDirectionsUrl(
  destination: DirectionsTarget,
  origin?: MapsCoords | null,
): string | null {
  const params = new URLSearchParams({ api: "1" });

  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }

  if (destination.lat != null && destination.lng != null) {
    params.set("destination", `${destination.lat},${destination.lng}`);
  } else if (destination.address?.trim()) {
    params.set("destination", `${destination.address.trim()}, Córdoba`);
  } else {
    return null;
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function hasDirectionsTarget(destination: DirectionsTarget): boolean {
  return (
    (destination.lat != null && destination.lng != null) ||
    Boolean(destination.address?.trim())
  );
}

/** Requests the device location (prompts if permission is not granted yet). */
export function getCurrentPosition(options?: PositionOptions): Promise<MapsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
        ...options,
      },
    );
  });
}
