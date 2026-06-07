const LOG_LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

const getLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel && LOG_LEVELS[envLevel.toLowerCase()] !== undefined) {
    return LOG_LEVELS[envLevel.toLowerCase()];
  }
  return LOG_LEVELS.error; // Default is error
};

const shouldLog = (level) => {
  return LOG_LEVELS[level] <= getLogLevel();
};

const formatMessage = (level, args) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]: ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ')}`;
};

const logger = {
  error: (...args) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', args));
    }
  },
  warn: (...args) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', args));
    }
  },
  info: (...args) => {
    if (shouldLog('info')) {
      console.info(formatMessage('info', args));
    }
  },
  debug: (...args) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', args));
    }
  }
};

export default logger;
