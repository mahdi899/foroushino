/** Viewer family id for scoping family-aware realtime patches (comment counts). */
let viewerFamilyId: number | null = null;

export function setViewerFamilyId(id: number | null | undefined): void {
  if (id == null || !Number.isFinite(id) || id <= 0) {
    viewerFamilyId = null;
    return;
  }
  viewerFamilyId = id;
}

export function getViewerFamilyId(): number | null {
  return viewerFamilyId;
}
