/** Helpers for opening Google Maps directions from Canuto. */

export type DirectionsTarget = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
};

/**
 * Opens Google Maps directions with only the destination set.
 * The user chooses origin and travel mode in Maps.
 */
export function buildGoogleMapsDirectionsUrl(
  destination: DirectionsTarget,
): string | null {
  const params = new URLSearchParams({ api: "1" });

  if (destination.address?.trim()) {
    params.set("destination", `${destination.address.trim()}, Córdoba`);
  } else if (destination.lat != null && destination.lng != null) {
    params.set("destination", `${destination.lat},${destination.lng}`);
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
