'use client';

import { AdminCollection } from '../AdminCollection';
import { testimonials } from '@/content/misc';

export default function AdminTestimonials() {
  return (
    <AdminCollection
      title="نظرات مراجعان"
      desc="مدیریت نظرات و امتیازها"
      collectionKey="testimonials"
      idKey="name"
      seed={testimonials.map((t) => ({ name: t.name, text: t.text, rating: t.rating }))}
      fields={[
        { key: 'name', label: 'نام', inList: true },
        { key: 'text', label: 'متن', type: 'textarea', inList: true },
        { key: 'rating', label: 'امتیاز', type: 'number', inList: true },
      ]}
    />
  );
}
