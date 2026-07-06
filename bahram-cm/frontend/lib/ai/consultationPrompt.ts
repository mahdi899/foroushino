import 'server-only';

import { consultationQuestions, recommendationMap } from '@/content/consultation';
import { buildSiteContextForAi, type AiSiteContext } from './siteContext';
import { DEFAULT_CONSULTATION_SYSTEM_PROMPT } from './types';

export interface ConsultationRecommendation {
  service: string;
  label: string;
  priceFrom: number;
  priceTo: number;
  note: string;
}

function formatToman(amount: number): string {
  if (!amount || amount <= 0) return '—';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)} میلیون تومان`;
  }
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

function answerLabels(answers: Record<string, string>): { question: string; answer: string }[] {
  return consultationQuestions
    .map((q) => {
      const value = answers[q.key];
      if (!value) return null;
      const option = q.options.find((o) => o.value === value);
      return { question: q.question, answer: option?.label ?? value };
    })
    .filter(Boolean) as { question: string; answer: string }[];
}

const EXTRA_ANSWER_KEYS = new Set(['user_notes', 'ai_estimate']);

function questionnaireAnswers(answers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(answers).filter(([key]) => !EXTRA_ANSWER_KEYS.has(key)));
}

function sitePricingSummary(ctx: AiSiteContext): string {
  const lines = ctx.services.flatMap((s) =>
    (s.lines.length ? s.lines : [{ name: s.title, priceFrom: s.priceFrom }]).map((line) => {
      const price = line.priceFrom ? ` از ${line.priceFrom}` : '';
      return `- ${s.title} / ${line.name}${price}`;
    }),
  );
  return lines.slice(0, 12).join('\n');
}

export function buildConsultationEstimateMessages(input: {
  name: string;
  userNotes?: string;
  answers: Record<string, string>;
  recommendation: ConsultationRecommendation;
  siteContext: AiSiteContext;
  customInstructions?: string;
}) {
  const { name, userNotes, recommendation, siteContext, customInstructions } = input;
  const answers = questionnaireAnswers(input.answers);
  const goalKey = answers.goal ?? 'unknown';
  const rec = recommendationMap[goalKey] ?? recommendation;

  const qaBlock = answerLabels(answers)
    .map((row) => `• ${row.question} → ${row.answer}`)
    .join('\n');

  const visitorBlock = [
    '=== اطلاعات مراجع ===',
    `نام: ${name.trim() || '—'}`,
    userNotes?.trim()
      ? `توضیحات خود کاربر:\n${userNotes.trim()}`
      : 'توضیحات خود کاربر: (وارد نشده)',
  ].join('\n');

  const userContent = [
    visitorBlock,
    '',
    '=== پاسخ‌های پرسشنامه ===',
    qaBlock,
    '',
    '=== پیشنهاد اولیه سیستم ===',
    `درمان: ${rec.label}`,
    `بازه قیمت پایه: ${formatToman(rec.priceFrom)} تا ${formatToman(rec.priceTo)}`,
    `توضیح: ${rec.note}`,
    '',
    '=== اطلاعات کلینیک ===',
    `نام: ${siteContext.brand.name}`,
    `محله: ${siteContext.brand.district}، ${siteContext.brand.city}`,
    `اقساط: تا ${siteContext.trust.installmentMonths} ماه`,
    '',
    '=== قیمت‌های مرجع سایت ===',
    sitePricingSummary(siteContext),
    '',
    'بر اساس نام، توضیحات آزاد کاربر، پاسخ‌های پرسشنامه و قیمت‌های بالا، یک برآورد اولیه شخصی‌سازی‌شده بنویس. اگر کاربر توضیح داده، حتماً در پاسخ به آن اشاره کن.',
  ].join('\n');

  const systemParts = [DEFAULT_CONSULTATION_SYSTEM_PROMPT];
  if (customInstructions?.trim()) {
    systemParts.push('', 'دستورالعمل‌های اضافی مدیر سایت:', customInstructions.trim());
  }

  return {
    messages: [
      { role: 'system' as const, content: systemParts.join('\n') },
      { role: 'user' as const, content: userContent },
    ],
  };
}

export async function buildConsultationEstimateMessagesFromSite(input: {
  name: string;
  userNotes?: string;
  answers: Record<string, string>;
  recommendation: ConsultationRecommendation;
  customInstructions?: string;
}) {
  const siteContext = await buildSiteContextForAi();
  return buildConsultationEstimateMessages({ ...input, siteContext });
}
