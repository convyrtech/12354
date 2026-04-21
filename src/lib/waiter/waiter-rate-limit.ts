const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_BUCKETS = 500;

type RateLimitBucket = {
  hits: number[];
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
}

// Map insertion order doubles as LRU — delete+set moves the bucket to
// the tail so `enforceMaxBuckets` can drop the head (oldest touched).
function touchBucket(store: RateLimitStore, key: string, bucket: RateLimitBucket) {
  store.delete(key);
  store.set(key, bucket);
}

function enforceMaxBuckets(store: RateLimitStore) {
  while (store.size > MAX_BUCKETS) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

export function checkWaiterRateLimit(ip: string, now: number = Date.now()) {
  const store = getStore();
  const key = ip.trim() || "unknown";
  const bucket = store.get(key) ?? { hits: [] };

  pruneBucket(bucket, now);

  if (bucket.hits.length >= MAX_REQUESTS) {
    touchBucket(store, key, bucket);
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
  touchBucket(store, key, bucket);
  enforceMaxBuckets(store);

  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - bucket.hits.length),
    retryAfterSeconds: 0,
  } as const;
}
