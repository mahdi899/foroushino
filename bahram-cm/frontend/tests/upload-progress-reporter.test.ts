import { describe, expect, it, vi } from 'vitest';
import { createUploadProgressReporter } from '@/lib/student/uploadProgressReporter';

describe('createUploadProgressReporter', () => {
  it('emits 0 and 100 immediately', () => {
    const onProgress = vi.fn();
    const report = createUploadProgressReporter(onProgress, 500);

    report(0);
    report(100);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 0);
    expect(onProgress).toHaveBeenNthCalledWith(2, 100);
  });

  it('dedupes identical percents', () => {
    const onProgress = vi.fn();
    const report = createUploadProgressReporter(onProgress, 0);

    report(40);
    report(40);
    report(41);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 40);
    expect(onProgress).toHaveBeenNthCalledWith(2, 41);
  });

  it('throttles rapid intermediate updates', () => {
    vi.useFakeTimers();
    const onProgress = vi.fn();
    const report = createUploadProgressReporter(onProgress, 120);

    report(10);
    report(20);
    vi.advanceTimersByTime(121);
    report(30);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 10);
    expect(onProgress).toHaveBeenNthCalledWith(2, 30);
    vi.useRealTimers();
  });
});
