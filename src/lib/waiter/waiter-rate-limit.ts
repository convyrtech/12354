const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_BUCKETS = 500;

type RateLimitBucket = {
  hits: number[];
  touchedAt: number;
};

type RateLimitStore = Map<string, RateLimitBucket>;

function getStore(): RateLimitStore {
  const root = globalThis as typeof globalThis & {
    __rakiWaiterRateLimitStore?: RateLimitStore;
  };

  if (!root.__rakiWaiterRateLimitStore) {
    root.__rakiWaiterRateLimitStore = new Map();
  }

  return root.__rakiWaiterRateLimitStore;
}

function pruneBucket(bucket: RateLimitBucket, now: number) {
  bucket.hits = bucket.hits.filter((timestamp) => now - timestamp < WINDOW_MS);
  bucket.touchedAt = now;
}

function enforceMaxBuckets(store: RateLimitStore) {
  if (store.size <= MAX_BUCKETS) {
    return;
  }

  const oldestEntries = [...store.entries()]
    .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    .slice(0, store.size - MAX_BUCKETS);

  for (const [key] of oldestEntries) {
    store.delete(key);
  }
}

export function checkWaiterRateLimit(ip: string, now: number = Date.now()) {
  const store = getStore();
  const key = ip.trim() || "unknown";
  const bucket = store.get(key) ?? { hits: [], touchedAt: now };

  pruneBucket(bucket, now);

  if (bucket.hits.length >= MAX_REQUESTS) {
    store.set(key, bucket);
    enforceMaxBuckets(store);

    const retryAfterMs = WINDOW_MS - (now - bucket.hits[0]);
    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    } as const;
  }

  bucket.hits.push(now);
  store.set(key, bucket);
  enforceMaxBuckets(store);

  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - bucket.hits.length),
    retryAfterSeconds: 0,
  } as const;
}
