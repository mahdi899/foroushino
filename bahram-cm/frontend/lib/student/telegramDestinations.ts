export interface StudentTelegramDestination {
  id: number;
  title: string;
  status: 'member' | 'invite';
  invite_url: string | null;
  mode: 'per_user' | 'shared';
  product_titles: string[];
}

export interface StudentTelegramDestinationsPayload {
  telegram_linked: boolean;
  telegram_bot_url: string | null;
  destinations: StudentTelegramDestination[];
}
