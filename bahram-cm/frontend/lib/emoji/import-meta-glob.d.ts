interface ImportMeta {
  glob<T = Record<string, () => Promise<{ default: T }>>>(
    pattern: string,
    options?: { eager?: boolean; import?: string },
  ): T;
}
