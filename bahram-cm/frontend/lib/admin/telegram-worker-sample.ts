import fs from 'fs/promises';
import path from 'path';

export { buildTelegramWorkerSample } from './telegram-worker-sample.build';
export type { TelegramWorkerSampleOptions } from './telegram-worker-sample.build';

export async function loadTelegramWorkerSample(): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), '..', 'worker', 'deploy.sample.js');
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}
