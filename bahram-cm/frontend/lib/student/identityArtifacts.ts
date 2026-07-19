/** Authenticated stream URL for the student's own identity artifact (cookie-based). */
export function studentIdentityArtifactStreamUrl(artifactId: number): string {
  return `/api/student/identity-artifacts/${artifactId}/stream`;
}
