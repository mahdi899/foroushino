/** Bahram commerce modules — native pages in /admin (Laravel API backend). */
export const commerceModules = [
  { href: '/admin/commerce/faqs', label: 'سوالات متداول', icon: 'HelpCircle', permission: 'content.manage' },
  { href: '/admin/commerce/testimonials', label: 'نظرات دانشجوها', icon: 'MessageSquareQuote', permission: 'content.manage' },
  { href: '/admin/commerce/products', label: 'محصولات', icon: 'ShoppingBag', permission: 'orders.view' },
  { href: '/admin/commerce/discount-codes', label: 'کدهای تخفیف', icon: 'TicketPercent', permission: 'orders.view' },
  { href: '/admin/commerce/orders', label: 'سفارش‌ها', icon: 'Receipt', permission: 'orders.view' },
  { href: '/admin/commerce/orders/reports', label: 'گزارش سفارشات', icon: 'BarChart3', permission: 'orders.view' },
  { href: '/admin/commerce/payment-settings', label: 'تنظیمات پرداخت', icon: 'CreditCard', permission: 'orders.view' },
] as const;
