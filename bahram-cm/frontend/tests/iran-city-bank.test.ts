import { describe, expect, it } from 'vitest';
import { completeIranCityInput, searchIranCitySuggestions } from '@/lib/iran/iranCityBank';

describe('searchIranCitySuggestions', () => {
  it('returns nothing before minimum length', () => {
    expect(searchIranCitySuggestions('ته')).toEqual([]);
  });

  it('suggests province-city label for a city name', () => {
    const results = searchIranCitySuggestions('ساوه');
    expect(results[0]?.label).toBe('مرکزی - ساوه');
  });

  it('maps ساوجبلاغ to البرز (شهرستان)', () => {
    const results = searchIranCitySuggestions('ساوجبلاغ');
    expect(results[0]?.label).toBe('البرز - ساوجبلاغ');
  });

  it('does not include administrative zone splits like اهواز1', () => {
    const results = searchIranCitySuggestions('اهواز');
    expect(results.some((item) => /\d/.test(item.city))).toBe(false);
    expect(results[0]?.city).toBe('اهواز');
    expect(results[0]?.province).toBe('خوزستان');
  });

  it('matches province names', () => {
    const results = searchIranCitySuggestions('گیلان');
    expect(results.some((item) => item.province === 'گیلان')).toBe(true);
  });
});

describe('completeIranCityInput', () => {
  it('does not complete before minimum length', () => {
    expect(completeIranCityInput('ته')).toBe('ته');
  });

  it('completes a city to province-city label', () => {
    expect(completeIranCityInput('ساوه')).toBe('مرکزی - ساوه');
  });

  it('keeps custom free text when no match exists', () => {
    expect(completeIranCityInput('روستای نمونه')).toBe('روستای نمونه');
  });
});
