interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const STATIC_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class TtlCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = STATIC_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() < entry.expiresAt) return entry.data as T;
    return undefined;
  }

  getStale<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    return entry ? (entry.data as T) : undefined;
  }

  set(key: string, data: unknown): void {
    this.store.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }
}
