export async function createMailbox(env) {
  const baseUrl = env?.TEMP_MAIL_API_BASE_URL;
  const apiKey = env?.TEMP_MAIL_API_KEY;

  if (!baseUrl) {
    throw new Error('TEMP_MAIL_API_BASE_URL is required to create a mailbox');
  }

  const url = `${baseUrl}/mailboxes`; // TODO: replace with provider-specific endpoint
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`; // TODO: adjust auth scheme for provider

  // TODO: add provider-specific payload if needed
  const response = await fetch(url, { method: 'POST', headers });
  if (!response.ok) {
    throw new Error(`Temp-mail provider error: ${response.status}`);
  }

  const data = await response.json();

  // TODO: map provider response fields to { id, address }
  return {
    id: data.id ?? data.mailboxId ?? data.address,
    address: data.address ?? data.email,
  };
}

export async function listMessages(env, mailboxId) {
  const baseUrl = env?.TEMP_MAIL_API_BASE_URL;
  const apiKey = env?.TEMP_MAIL_API_KEY;
  if (!baseUrl) {
    throw new Error('TEMP_MAIL_API_BASE_URL is required to list messages');
  }

  const url = `${baseUrl}/mailboxes/${encodeURIComponent(mailboxId)}/messages`; // TODO: adjust path
  const headers = { 'Accept': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`; // TODO: adjust auth scheme

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`Temp-mail provider error: ${response.status}`);
  }

  const data = await response.json();
  // TODO: map provider list payload
  return (data.messages ?? data ?? []).map((item) => ({
    id: item.id ?? item.messageId,
    from: item.from ?? item.sender,
    subject: item.subject ?? '(без темы)',
    receivedAt: item.receivedAt ?? item.createdAt ?? item.date,
    isRead: Boolean(item.isRead ?? false),
  }));
}

export async function getMessage(env, mailboxId, messageId) {
  const baseUrl = env?.TEMP_MAIL_API_BASE_URL;
  const apiKey = env?.TEMP_MAIL_API_KEY;
  if (!baseUrl) {
    throw new Error('TEMP_MAIL_API_BASE_URL is required to fetch message');
  }

  const url = `${baseUrl}/mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}`; // TODO: adjust path
  const headers = { 'Accept': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`; // TODO: adjust auth scheme

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`Temp-mail provider error: ${response.status}`);
  }

  const data = await response.json();
  // TODO: map provider detail payload
  return {
    id: data.id ?? data.messageId ?? messageId,
    from: data.from ?? data.sender,
    to: data.to ?? data.recipient,
    subject: data.subject ?? '(без темы)',
    receivedAt: data.receivedAt ?? data.createdAt ?? data.date,
    textBody: data.text ?? data.textBody ?? '',
    htmlBody: data.html ?? data.htmlBody ?? '',
  };
}
