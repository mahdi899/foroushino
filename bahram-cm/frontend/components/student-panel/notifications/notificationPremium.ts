/** Confirmed payment notifications get a premium gradient border. */
export function isOrderPaidNotification(type: string | null | undefined): boolean {
  return type === 'order_paid';
}
