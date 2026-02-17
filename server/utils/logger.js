const LEVELS = { info: 'INFO', warn: 'WARN', error: 'ERROR', audit: 'AUDIT' };

function formatLog(level, context, message, data) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] [${context}] ${message}`;
  if (data) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

const logger = {
  info(context, message, data) {
    console.log(formatLog(LEVELS.info, context, message, data));
  },
  warn(context, message, data) {
    console.warn(formatLog(LEVELS.warn, context, message, data));
  },
  error(context, message, data) {
    console.error(formatLog(LEVELS.error, context, message, data));
  },
  audit(context, message, data) {
    console.log(formatLog(LEVELS.audit, context, message, data));
  },
};

module.exports = logger;
