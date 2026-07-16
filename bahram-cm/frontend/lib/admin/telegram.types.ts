export type TelegramBotHealth = {
  token_present: boolean;
  api_reachable: boolean;
  webhook_url: string | null;
};

export type TelegramHealthSnapshot = {
  healthy: boolean;
  database: boolean;
  bots: Record<string, TelegramBotHealth>;
  updates: {
    pending: number;
    failed: number;
  };
};

export type TelegramModuleTone = 'teal' | 'gold' | 'blue' | 'green' | 'amber';

export type TelegramModule = {
  href: string;
  label: string;
  description: string;
  icon: string;
  tone: TelegramModuleTone;
  permission: string;
  group: 'users' | 'ops' | 'content' | 'system';
};
