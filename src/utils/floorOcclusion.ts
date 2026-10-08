/**
 * Campus Room Finder - Architectural Floor Occlusion Utility
 * Determines whether a Ground Floor point (room or POI) is occluded by the
 * First Floor building slab when viewed from the camera.
 */
export function isPointOccludedByFirstFloor(
  pointCoords: [number, number, number],
  cameraPos: [number, number, number],
  slabElevation: number = 5.65
): boolean {
  const [px, py, pz] = pointCoords;
  const [cx, cy, cz] = cameraPos;

  // If camera is below the first floor slab, camera is tilted and looking into the gap between floors:
  // The First Floor slab is above the line of sight -> NOT occluded by slab!
  if (cy <= slabElevation) return false;

  // If the point itself is on or above the slab (e.g. First Floor object), cannot be occluded by its own slab!
  if (py >= slabElevation) return false;

  // Calculate ray-plane intersection where ray from camera to point crosses y = slabElevation:
  // P(t) = C + t * (P - C), where y(t) = slabElevation
  const dy = cy - py;
  if (Math.abs(dy) < 0.001) return false;
  const t = (cy - slabElevation) / dy;

  const ix = cx + t * (px - cx);
  const iz = cz + t * (pz - cz);

  // First Floor building wings outer bounds:
  // North/South slabs extend to |z| <= 29, East/West slabs extend to |x| <= 27
  const isInsideBuildingWings = Math.abs(ix) <= 27 && Math.abs(iz) <= 29;

  // Central quadrangle courtyard is open sky:
  // Inner courtyard edges are at |x| < 12.5 and |z| < 12.5
  const isInsideOpenCourtyard = Math.abs(ix) < 12.5 && Math.abs(iz) < 12.5;

  // Occluded if the line of sight passes through the solid First Floor slab wings
  return isInsideBuildingWings && !isInsideOpenCourtyard;
}
