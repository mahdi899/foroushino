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

export type TelegramInfrastructureView = {
  worker_url: string;
  mode: 'direct' | 'worker' | 'host';
  backend_origin: string;
  server_webhook_url: string;
  worker_webhook_url: string | null;
  has_connection_token: boolean;
  connection_token_preview: string | null;
  configured: boolean;
  worker_sample_template?: string | null;
  worker_deploy_sample?: string | null;
  /** Filled PHP host-proxy sample (index.php) for German/shared hosting. */
  host_proxy_deploy_sample?: string | null;
  /** Matching .htaccess sample for the host-proxy folder. */
  host_proxy_htaccess_sample?: string | null;
  /** Explicit bridge type persisted server-side — 'host' means the standalone telegram/ app. */
  bridge_type?: 'direct' | 'worker' | 'host';
  has_host_secrets?: boolean;
  host_sync_secret_preview?: string | null;
  host_encryption_key_preview?: string | null;
  host_sync_base_url?: string | null;
  /** Filled config.php for the standalone telegram/ host app. */
  host_config_sample?: string | null;
};

export type TelegramModule = {
  href: string;
  label: string;
  description: string;
  icon: string;
  tone: TelegramModuleTone;
  permission: string;
  group: 'users' | 'ops' | 'content' | 'system';
};

export type PaginatedMeta = {
  current_page: number;
  last_page: number;
  total: number;
};

export type TelegramBotView = {
  id: number;
  key: string;
  display_name: string;
  username: string | null;
  environment: string;
  is_active: boolean;
  token_present: boolean;
  bot_token_preview?: string | null;
  api_reachable: boolean;
  webhook_url: string | null;
  support_group_chat_id?: string | null;
  reports_chat_id?: string | null;
  reports_topic_id?: number | null;
  payment_reports_chat_id?: string | null;
  settings?: Record<string, unknown>;
  token_key?: string;
};

export type TelegramBotProfileView = {
  name: string | null;
  description: string | null;
  short_description: string | null;
  username: string | null;
  has_profile_photo?: boolean;
  profile_photo_data_url?: string | null;
};

export type TelegramAccountView = {
  id: number;
  telegram_bot_id: number;
  bot_key?: string;
  bot_name?: string;
  telegram_user_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  mobile_masked: string | null;
  mobile: string | null;
  user_id: number | null;
  user_name: string | null;
  is_blocked: boolean;
  is_bot_admin: boolean;
  bot_admin_rank?: 'simple' | 'super' | null;
  is_permanent_bot_admin?: boolean;
  is_linked: boolean;
  mobile_verified_at: string | null;
  created_at: string | null;
  conversation_state?: string | null;
};

export type TelegramRequiredChatView = {
  id: number;
  telegram_bot_id: number;
  bot_key?: string;
  bot_name?: string;
  chat_id: string;
  title: string;
  invite_link: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
};

export type TelegramDestinationRequirementView = {
  id: number;
  requirement_type: string;
  requirement_value: string | null;
  group_key: string | null;
  operator: string | null;
};

export type TelegramDestinationView = {
  id: number;
  telegram_bot_id: number;
  bot_key?: string;
  bot_name?: string;
  title: string;
  chat_id: string;
  chat_type: string;
  username: string | null;
  join_request_url: string | null;
  access_mode: string;
  is_active: boolean;
  welcome_inside_chat: boolean;
  requirements_count: number;
  created_at: string | null;
  requirements?: TelegramDestinationRequirementView[];
};

export type TelegramBroadcastView = {
  id: number;
  telegram_bot_id: number;
  bot_key?: string;
  bot_name?: string;
  title: string;
  status: string;
  segment_key: string | null;
  audience_count: number;
  requires_second_approval: boolean;
  created_by: number | null;
  approved_by: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  stopped_at: string | null;
  created_at: string | null;
  text?: string;
  options?: Record<string, unknown>;
  recipient_stats?: Record<string, number>;
};

export type TelegramBroadcastSegmentView = {
  key: string;
  label: string;
  count: number;
};

export type TelegramBotMessageView = {
  key: string;
  label: string;
  category: string;
  body: string;
  is_custom: boolean;
};

export type TelegramStatsPeriodView = {
  period: string;
  from: string;
  to: string;
  unique_users: number;
  new_users: number;
  updates_count: number;
};

export type TelegramStatsSummaryView = {
  day: TelegramStatsPeriodView;
  week: TelegramStatsPeriodView;
  month: TelegramStatsPeriodView;
};

export type TelegramSupportCategoryView = {
  id: number;
  key: string;
  title_fa: string;
  default_topic_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
};

export type TelegramOperatorView = {
  id: number;
  telegram_user_id: number;
  admin_user_id: number | null;
  admin_name: string | null;
  admin_email: string | null;
  display_name: string | null;
  support_role: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string | null;
};

export type TelegramUpdateLogView = {
  id: number;
  telegram_bot_id: number;
  bot_key?: string;
  update_id: number;
  update_type: string;
  status: string;
  attempts: number;
  error_message: string | null;
  telegram_user_id: number | null;
  received_at: string | null;
  failed_at: string | null;
  payload?: Record<string, unknown>;
};

export type TelegramDeliveryLogView = {
  id: number;
  telegram_bot_id: number;
  telegram_account_id: number | null;
  channel: string;
  purpose: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};
