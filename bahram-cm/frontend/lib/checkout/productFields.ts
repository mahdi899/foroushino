import type { ProductDetail } from '@/lib/services/products';
import type { StudentProfile } from '@/lib/student/session';

export type CheckoutFieldType = 'text' | 'number' | 'textarea';

export type CheckoutField = {
  key: string;
  label: string;
  type: CheckoutFieldType;
  required?: boolean;
  placeholder?: string;
};

const FIELDS_BY_TYPE: Record<string, CheckoutField[]> = {
  manual_service: [
    { key: 'city', label: 'شهر', type: 'text', required: true },
    { key: 'notes', label: 'توضیحات درخواست', type: 'textarea' },
  ],
  event: [
    { key: 'city', label: 'شهر', type: 'text', required: true },
    { key: 'age', label: 'سن', type: 'number', required: true },
  ],
};

export function productCheckoutFields(product: ProductDetail): CheckoutField[] {
  return FIELDS_BY_TYPE[product.type] ?? [];
}

export function productNeedsExtraForm(product: ProductDetail): boolean {
  return productCheckoutFields(product).length > 0;
}

export function prefillExtraFields(
  fields: CheckoutField[],
  profile: StudentProfile | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    if (field.key === 'city' && profile?.city) out.city = profile.city;
    if (field.key === 'age' && profile?.age != null) out.age = String(profile.age);
  }
  return out;
}

export function buildCustomerName(profile: StudentProfile | null | undefined, fallbackName: string): string {
  const full = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  return full || fallbackName.trim() || 'خریدار';
}

export function isCompleteCustomerName(name: string | null | undefined): boolean {
  const trimmed = (name ?? '').trim();
  return (
    trimmed.length >= 2 &&
    trimmed !== 'دانشجو' &&
    trimmed !== 'خریدار' &&
    trimmed !== 'خریدار موقت'
  );
}
