const VERBOSE = process.env.LOG_VERBOSE === '1' || process.env.LOG_VERBOSE === 'true';

function ts() {
  return new Date().toISOString();
}

function base(fields) {
  return { timestamp: ts(), ...fields };
}

function log(level, message, meta) {
  const entry = base({ level, message, ...meta });
  if (level === 'error') {
    console.error('[Server]', JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn('[Server]', JSON.stringify(entry));
  } else if (VERBOSE || level === 'info') {
    console.log('[Server]', JSON.stringify(entry));
  }
}

module.exports = {
  info: (message, meta = {}) => log('info', message, meta),
  warn: (message, meta = {}) => log('warn', message, meta),
  error: (message, meta = {}) => log('error', message, meta),
  verboseEnabled: VERBOSE,
};
