export type TelegramWorkerSampleOptions = {
  backendOrigin: string;
  proxySharedToken: string;
  webhookSecret: string;
};

export function buildTelegramWorkerSample(template: string, options: TelegramWorkerSampleOptions): string {
  const origin = options.backendOrigin.trim() || "https://rostami.app";
  const token = options.proxySharedToken.trim();
  const webhookSecret = options.webhookSecret.trim();

  return template
    .replaceAll("__BACKEND_ORIGIN__", origin)
    .replaceAll("__PROXY_SHARED_TOKEN__", token)
    .replaceAll("__TELEGRAM_WEBHOOK_SECRET__", webhookSecret)
    .trim();
}
