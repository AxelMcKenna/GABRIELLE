export type LngLat = { lng: number; lat: number };

const R = 6_378_137;

export function destination(origin: LngLat, bearingDeg: number, distanceM: number): LngLat {
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const dr = distanceM / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(dr) * Math.cos(lat1),
      Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

export type GridParams = {
  rows: number;
  cols: number;
  minLng: number;
  minLat: number;
  dLng: number;
  dLat: number;
};

/**
 * Build grid parameters for a `rows × cols` grid spanning `sideM` meters,
 * centered on `center`. Cells are roughly square in meters near the equator;
 * skew increases at high latitudes.
 */
export function gridParamsFor(
  center: LngLat,
  rows: number,
  cols: number,
  sideM = 1000
): GridParams {
  const cellM = sideM / Math.max(rows, cols);
  const dLat = cellM / 111_000;
  const dLng = cellM / (111_000 * Math.cos((center.lat * Math.PI) / 180));
  return {
    rows,
    cols,
    dLat,
    dLng,
    minLat: center.lat - (rows / 2) * dLat,
    minLng: center.lng - (cols / 2) * dLng,
  };
}
