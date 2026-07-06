import { notFound } from 'next/navigation';
import { getStudentTestimonial } from '@/lib/admin/commerceData';
import { TestimonialForm } from '../TestimonialForm';

export const dynamic = 'force-dynamic';

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testimonial = await getStudentTestimonial(Number(id));
  if (!testimonial) notFound();

  return <TestimonialForm testimonial={testimonial} />;
}
