'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  registerTelegramWebhookFromPanelAction,
  saveTelegramInfrastructureAction,
  suggestTelegramSecretsAction,
} from '@/app/admin/(panel)/telegram/actions';
import type { TelegramInfrastructureView } from '@/lib/admin/telegram.types';
import { buildTelegramWorkerSample } from '@/lib/admin/telegram-worker-sample.build';

export type BridgeMode = 'direct' | 'worker' | 'host';

export function useTelegramBridgeDraft(initial: TelegramInfrastructureView, workerSampleTemplate: string | null) {
  const router = useRouter();
  const [mode, setMode] = useState<BridgeMode>(initial.mode ?? 'direct');
  const [workerUrl, setWorkerUrl] = useState(initial.worker_url ?? '');
  const [workerToken, setWorkerToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [pending, startTransition] = useTransition();
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (mode !== 'worker' || initial.has_connection_token || (workerToken && webhookSecret)) {
      return;
    }

    let cancelled = false;
    void suggestTelegramSecretsAction().then((res) => {
      if (cancelled || !res.ok || !res.data) {
        return;
      }
      setWorkerToken(res.data.bearer_token);
      setWebhookSecret(res.data.webhook_secret);
    });

    return () => {
      cancelled = true;
    };
  }, [mode, workerToken, webhookSecret, initial.has_connection_token]);

  const workerSource = useMemo(() => {
    if (mode !== 'worker') {
      return null;
    }

    if (initial.worker_deploy_sample && initial.has_connection_token && !workerToken) {
      return initial.worker_deploy_sample;
    }

    if (!workerSampleTemplate || !workerToken || !webhookSecret) {
      return null;
    }

    return buildTelegramWorkerSample(workerSampleTemplate, {
      backendOrigin: initial.backend_origin,
      proxySharedToken: workerToken,
      webhookSecret,
    });
  }, [
    mode,
    workerSampleTemplate,
    initial.backend_origin,
    initial.worker_deploy_sample,
    initial.has_connection_token,
    workerToken,
    webhookSecret,
  ]);

  const saveInfrastructure = async () => {
    if ((mode === 'worker' || mode === 'host') && !workerUrl.trim()) {
      return { ok: false as const, error: 'آدرس را وارد کنید.' };
    }

    const res = await saveTelegramInfrastructureAction({
      mode,
      worker_url: mode === 'worker' || mode === 'host' ? workerUrl.trim() : '',
      connection_token_input: mode === 'worker' ? workerToken || undefined : undefined,
      webhook_secret_input: mode === 'worker' ? webhookSecret || undefined : undefined,
    });
    if (res.ok) {
      router.refresh();
    }
    return res;
  };

  const registerWebhook = async () => {
    const saveRes = await saveInfrastructure();
    if (!saveRes.ok) {
      return saveRes;
    }
    const res = await registerTelegramWebhookFromPanelAction();
    if (res.ok) {
      router.refresh();
    }
    return res;
  };

  return {
    mode,
    setMode,
    workerUrl,
    setWorkerUrl,
    workerSource,
    pending,
    registering,
    startTransition,
    setRegistering,
    saveInfrastructure,
    registerWebhook,
  };
}
