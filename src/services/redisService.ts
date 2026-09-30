import Redis from "ioredis";

class MemoryCache {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*"));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async flushAll(): Promise<void> {
    this.store.clear();
  }

  async count(): Promise<number> {
    let active = 0;
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.store.delete(key);
      } else {
        active++;
      }
    }
    return active;
  }
}

const memoryCache = new MemoryCache();
let redisClient: Redis | null = null;
let isConnected = false;

if (process.env.NODE_ENV !== "test" && process.env.ENABLE_REDIS === "true") {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    connectTimeout: 500
  });

  client.on("error", () => {
    isConnected = false;
  });

  client.connect().then(() => {
    isConnected = true;
    redisClient = client;
  }).catch(() => {
    isConnected = false;
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = redisClient && isConnected
      ? await redisClient.get(key)
      : await memoryCache.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = 30): Promise<void> {
  try {
    const str = JSON.stringify(value);
    if (redisClient && isConnected) {
      await redisClient.set(key, str, "EX", ttlSeconds);
    } else {
      await memoryCache.set(key, str, ttlSeconds);
    }
  } catch {}
}

export async function cacheDel(key: string): Promise<void> {
  try {
    if (redisClient && isConnected) {
      await redisClient.del(key);
    } else {
      await memoryCache.del(key);
    }
  } catch {}
}

export async function invalidateServiceCache(serviceName: string): Promise<void> {
  try {
    if (redisClient && isConnected) {
      const keys = await redisClient.keys(`telemetry:*:${serviceName}*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      await memoryCache.delPattern(`telemetry:*:${serviceName}*`);
    }
  } catch {}
}

export async function cacheFlushAll(): Promise<void> {
  try {
    if (redisClient && isConnected) {
      await redisClient.flushall();
    } else {
      await memoryCache.flushAll();
    }
  } catch {}
}

export async function saveAgentSession(sessionId: string, state: any, ttlSeconds: number = 3600): Promise<void> {
  await cacheSet(`session:${sessionId}`, state, ttlSeconds);
}

export async function getAgentSession(sessionId: string): Promise<any | null> {
  return cacheGet(`session:${sessionId}`);
}

export async function getCacheStatus(): Promise<{ connected: boolean; backend: "redis" | "memory"; keysCount: number }> {
  if (redisClient && isConnected) {
    const dbsize = await redisClient.dbsize();
    return {
      connected: true,
      backend: "redis",
      keysCount: dbsize
    };
  }

  const count = await memoryCache.count();
  return {
    connected: false,
    backend: "memory",
    keysCount: count
  };
}
