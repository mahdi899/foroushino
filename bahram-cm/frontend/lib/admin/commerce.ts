/** Bahram commerce modules — native pages in /admin (Laravel API backend). */
export const commerceModules = [
  { href: '/admin/commerce/faqs', label: 'سوالات متداول', icon: 'HelpCircle' },
  { href: '/admin/commerce/testimonials', label: 'نظرات دانشجوها', icon: 'MessageSquareQuote' },
  { href: '/admin/commerce/products', label: 'محصولات', icon: 'ShoppingBag' },
  { href: '/admin/commerce/discount-codes', label: 'کدهای تخفیف', icon: 'TicketPercent' },
  { href: '/admin/commerce/orders', label: 'سفارش‌ها', icon: 'Receipt' },
  { href: '/admin/commerce/orders/reports', label: 'گزارش سفارشات', icon: 'BarChart3' },
  { href: '/admin/commerce/payment-settings', label: 'تنظیمات پرداخت', icon: 'CreditCard' },
] as const;
