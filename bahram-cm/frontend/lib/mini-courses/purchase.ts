export function miniCoursePurchaseSlug(courseSlug: string): string {
  return `mini-course-${courseSlug}`;
}

export function miniCoursePurchasePath(courseSlug: string): string {
  return `/purchase/${encodeURIComponent(miniCoursePurchaseSlug(courseSlug))}`;
}
