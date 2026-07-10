export type MiniCourseEnrollmentStatus = {
  enrolled: boolean;
  enrollmentNumber: string | null;
};

export async function fetchMiniCourseEnrollmentStatus(
  slug: string,
): Promise<MiniCourseEnrollmentStatus> {
  const res = await fetch(
    `/api/student/mini-courses/${encodeURIComponent(slug)}/enrollment`,
    {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    return { enrolled: false, enrollmentNumber: null };
  }

  const json = (await res.json()) as MiniCourseEnrollmentStatus;
  return {
    enrolled: Boolean(json.enrolled),
    enrollmentNumber: json.enrollmentNumber ?? null,
  };
}
