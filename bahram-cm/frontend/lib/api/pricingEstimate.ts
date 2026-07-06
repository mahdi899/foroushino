import { apiData } from './client';
import type { ApiPricingEstimate } from './types';

export interface EstimateInput {
  line: string;
  brand?: string;
  units?: number;
  payment_type?: 'cash' | 'installment';
}

/** Client-side teaser estimate (never returns the exact installment plan). */
export async function getEstimate(input: EstimateInput): Promise<ApiPricingEstimate> {
  return apiData<ApiPricingEstimate>('/pricing/estimate', {
    method: 'POST',
    body: input,
    client: true,
  });
}
