const serviceName = 'good-pass-service';
const serviceVersion = '2025.03.27';

/** One JSON line per event: stdout locally, Workers logs on Cloudflare Pages. */
export function log(level, message, context) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: serviceName,
    version: serviceVersion,
    msg: message,
    context
  };
  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else {
    console.log(output);
  }
}
