/** Bahram commerce modules — native pages in /admin (Laravel API backend). */
export const commerceModules = [
  { href: '/admin/commerce/products', label: 'محصولات', icon: 'ShoppingBag' },
  { href: '/admin/commerce/orders', label: 'سفارش‌ها', icon: 'Receipt' },
  { href: '/admin/commerce/faqs', label: 'سوالات متداول', icon: 'HelpCircle' },
  { href: '/admin/commerce/payment-settings', label: 'تنظیمات پرداخت', icon: 'CreditCard' },
  { href: '/admin/commerce/sms-spotplayer-settings', label: 'پیامک و SpotPlayer', icon: 'Smartphone' },
] as const;
