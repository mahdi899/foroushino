import { type NextRequest, NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';
import { STUDENT_TOKEN_COOKIE } from '@/lib/student/session';

export const dynamic = 'force-dynamic';

type EnrollmentPayload = {
  enrolled: boolean;
  enrollmentNumber: string | null;
};

function emptyEnrollment(): EnrollmentPayload {
  return { enrolled: false, enrollmentNumber: null };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse<EnrollmentPayload>> {
  const { slug } = await context.params;
  const token = request.cookies.get(STUDENT_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(emptyEnrollment(), {
      headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
    });
  }

  try {
    const res = await fetch(
      `${SERVER_API_URL}/student/mini-courses/${encodeURIComponent(slug)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      return NextResponse.json(emptyEnrollment(), {
        headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
      });
    }

    const json = (await res.json()) as {
      data?: {
        enrolled?: boolean;
        order_number?: string | null;
        enrollment_number?: string | null;
      };
    };

    return NextResponse.json(
      {
        enrolled: Boolean(json.data?.enrolled),
        enrollmentNumber: json.data?.order_number ?? json.data?.enrollment_number ?? null,
      },
      { headers: { 'Cache-Control': 'private, no-store, must-revalidate' } },
    );
  } catch {
    return NextResponse.json(emptyEnrollment(), {
      headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
    });
  }
}
