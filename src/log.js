const serviceName = 'good-pass-service';
// The same number as package.json and the top entry of CHANGELOG.md: it is the
// `version` field of every log line.
const serviceVersion = '1.2.0';

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
