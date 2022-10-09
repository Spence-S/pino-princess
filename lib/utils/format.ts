import chalk from 'chalk';
import dayjs from 'dayjs';
import type {SerializedError} from 'pino';
import prettyMs from 'pretty-ms';
import type {Formatters, Levels, Colors, MessageObj} from './types';

const nl = '\n';

const stringify = (obj: unknown) =>
  JSON.stringify(obj, null, 2)
    .replace(/^{\n/, '')
    // .replace(/\n}$/, '')
    .replace(/{/g, '')
    .replace(/\s*},/g, '')
    .replace(/\s*}/g, '');

let formatters: Formatters | undefined;

export default getFormatters;

function getFormatters(_formatters?: Formatters): Formatters {
  formatters = _formatters;

  return {
    formatLevel,
    formatLoadTime,
    formatDate,
    formatName,
    formatMessage,
    formatBundleSize,
    formatNs,
    formatExtraFields,
    formatMethod,
    formatStack,
    formatUrl,
    formatStatusCode,
    formatErrorProp,
  };
}

const emojiMap = {
  warn: '⚠️',
  info: '✨',
  userlvl: '✨',
  error: '🚨',
  debug: '🐛',
  fatal: '💀',
  trace: '🔍',
};

const colorMap: Record<Levels | 'userlvl', Colors> = {
  warn: 'yellow',
  info: 'cyan',
  userlvl: 'cyan',
  error: 'red',
  debug: 'blue',
  trace: 'white',
  fatal: 'red',
};

function isWideEmoji(character: string): boolean {
  return character !== '⚠️';
}

function formatLevel(level: Levels | 'userlvl'): string {
  if (formatters?.formatLevel) return formatters.formatLevel(level, {chalk});
  if (!emojiMap?.[level]) return '';
  const endlen = 5;
  const emoji = emojiMap[level];
  const padding = isWideEmoji(emoji) ? ' ' : '  ';
  const formattedLevel = chalk[colorMap[level]](level.toUpperCase());
  const endPadding = endlen - level.length;
  return emoji + padding + formattedLevel + ''.padEnd(endPadding, ' ');
}

function formatLoadTime(elapsedTime: string | number): string {
  if (formatters?.formatLoadTime)
    return formatters.formatLoadTime(elapsedTime, {chalk});
  const elapsed =
    typeof elapsedTime === 'string'
      ? Number.parseInt(elapsedTime, 10)
      : elapsedTime;
  const time = prettyMs(elapsed);
  return elapsed > 500
    ? chalk.red(time)
    : elapsed > 250
    ? chalk.yellow(time)
    : chalk.green(time);
}

function formatDate(instant: string | number): string {
  if (formatters?.formatDate) return formatters.formatDate(instant, {chalk});
  return chalk.gray(dayjs(instant).format('H:mm:ss'));
}

function formatName(name: string): string {
  if (formatters?.formatName) return formatters.formatName(name, {chalk});

  if (!name) return '';

  return `- ${chalk.blue(name)}:`;
}

function formatMessage({level, message}: MessageObj): string {
  if (formatters?.formatMessage)
    return formatters.formatMessage({level, message}, {chalk});
  if (typeof message === 'undefined') return '';
  message = formatMessageName(message);
  let pretty = '';
  if (level === 'error') pretty = chalk.red(message);
  if (level === 'trace') pretty = chalk.cyan(message);
  if (level === 'warn') pretty = chalk.yellow(message);
  if (level === 'debug') pretty = chalk.white(message);
  if (level === 'info' || level === 'userlvl') pretty = chalk.white(message);
  if (level === 'fatal') pretty = chalk.white.bgRed(message);

  return pretty;
}

function formatMessageName(message: string): string {
  if (message === 'request') return '<--';
  if (message === 'response') return '-->';
  return message;
}

function formatBundleSize(bundle: string): string {
  const bytes = Number.parseInt(bundle, 10);
  const size = `${bytes}B`;
  return chalk.gray(size);
}

function formatNs(name: string): string {
  return chalk.cyan(name);
}

function formatUrl(url: string): string {
  return chalk.magenta(url);
}

function formatMethod(method: string): string {
  return method ? chalk.white(method) : '';
}

function formatStatusCode(statusCode: string | number = 'xxx'): string {
  return chalk[
    statusCode < 300 ? 'green' : statusCode < 500 ? 'yellow' : 'red'
  ](statusCode);
}

function formatStack(stack: string): string {
  return stack ? chalk.grey(nl + stack) : '';
}

function formatErrorProp(errorPropValue: Partial<SerializedError>): string {
  if (
    errorPropValue.type &&
    ['Error', 'TypeError'].includes(errorPropValue.type)
  ) {
    delete errorPropValue.type;
    if (errorPropValue.stack) delete errorPropValue.stack;
    if (errorPropValue.message) delete errorPropValue.message;
  }

  if (Object.keys(errorPropValue).length === 0) return '';

  return nl + chalk.grey(stringify(errorPropValue));
}

function formatExtraFields(extraFields: Record<string, any>): string {
  // const deepClean = (obj) => {
  //   for (const val of Object.keys(obj)) {
  //     if (isObject(obj) && isEmpty(obj[val])) {
  //       delete obj[val];
  //     } else if (isObject(obj[val])) obj[val] = deepClean(obj[val]);
  //   }

  //   return obj;
  // };

  // deepClean(extraFields);

  // if (isEmpty(extraFields)) return '';

  return nl + chalk.grey(stringify(extraFields));
}
