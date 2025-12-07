const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_MAILBOX_PER_IP = 3;
const memoryState = {
  mailboxes: new Map(),
  ipCounts: new Map(),
};

export async function createMailboxRecord(env, { address, providerMailboxId, ip, userAgent, now = Date.now(), ttlMs = DEFAULT_TTL_MS }) {
  pruneExpired();
  const rateKey = ip ?? 'unknown';
  const activeCount = memoryState.ipCounts.get(rateKey) ?? 0;
  if (activeCount >= MAX_MAILBOX_PER_IP) {
    throw new Error('temp_mail_rate_limit');
  }

  const id = crypto.randomUUID();
  const accessToken = crypto.randomUUID();
  const record = {
    id,
    providerMailboxId,
    address,
    accessToken,
    createdAt: now,
    expiresAt: now + ttlMs,
    ip: rateKey,
    userAgent: userAgent ?? 'unknown'
  };

  memoryState.mailboxes.set(id, record);
  memoryState.ipCounts.set(rateKey, activeCount + 1);

  if (env?.TEMP_MAILBOX_KV) {
    await env.TEMP_MAILBOX_KV.put(kvKey(id), JSON.stringify(record), { expiration: Math.floor(record.expiresAt / 1000) });
  }

  return record;
}

export async function getMailboxRecord(env, id) {
  pruneExpired();
  const existing = memoryState.mailboxes.get(id);
  if (existing) return existing;

  if (env?.TEMP_MAILBOX_KV) {
    const raw = await env.TEMP_MAILBOX_KV.get(kvKey(id));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        memoryState.mailboxes.set(id, parsed);
        return parsed;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function purgeMailbox(env, id) {
  memoryState.mailboxes.delete(id);
  if (env?.TEMP_MAILBOX_KV) {
    await env.TEMP_MAILBOX_KV.delete(kvKey(id));
  }
}

export function isExpired(record, now = Date.now()) {
  return !record || now >= record.expiresAt;
}

function pruneExpired(now = Date.now()) {
  for (const [id, record] of memoryState.mailboxes.entries()) {
    if (isExpired(record, now)) {
      memoryState.mailboxes.delete(id);
      const current = memoryState.ipCounts.get(record.ip ?? 'unknown') ?? 1;
      memoryState.ipCounts.set(record.ip ?? 'unknown', Math.max(0, current - 1));
    }
  }
}

function kvKey(id) {
  return `mailbox:${id}`;
}
