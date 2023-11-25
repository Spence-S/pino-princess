import jsonParse from 'fast-json-parse';
import unset from 'unset-value';
import get from 'get-value';
import set from 'set-value';
import isObject from './utils/is-object';
import isEmpty from './utils/is-empty';
import convertLogNumber from './utils/convert-log-number';
import {WHITE_LIST, BLACK_LIST} from './defaults';
import getFormatters from './utils/format';
import type {PrettifyOptions} from './utils/types';

type LogObject = Record<string, unknown>;

const nl = '\n';

export function prettify({
  /**
   * white list and black list both take keys with dot notation
   */
  blacklist = [],
  /**
   * whitelist always overrides black list
   */
  whitelist = [],
  /**
   * Theme for the extra fields object
   */
  theme = (chalk) => ({}),
  /**
   * Format functions for any given key
   */
  format = {},
  /**
   * defines the order in which format functions are ran
   */
  template = [
    'date',
    'name',
    'level',
    'req.id',
    'req.method',
    'res.statusCode',
    'req.url',
    'msg',
    'responseTime',
  ],
}: PrettifyOptions = {}) {
  const formatKeys = Object.keys(format);
  const formatters: Record<string, (...args: any[]) => string> = {
    ...getFormatters(),
    ...format,
  };

  // eslint-disable-next-line complexity
  return function (
    inputData: string | Record<string, unknown>,
  ): string | undefined {
    try {
      let object: LogObject = {};
      if (typeof inputData === 'string') {
        const parsedData = jsonParse(inputData);
        if (!parsedData.value || parsedData.err) {
          return inputData + nl;
        }

        object = parsedData.value as LogObject;
      } else if (isObject(inputData)) {
        object = inputData as LogObject;
      } else {
        return nl;
      }

      // cache the whitelist
      const whiteListObj = {};
      for (const key of [
        ...whitelist,
        ...WHITE_LIST,
        ...formatKeys,
        ...template,
      ]) {
        const val: unknown = get(object, key);
        if (val) set(whiteListObj, key, val);
      }

      // remove the blacklist
      for (const key of [...BLACK_LIST, ...blacklist]) unset(object, key);

      // add back in the whitelist
      object = {
        ...object,
        ...whiteListObj,
      };

      if (!object.date) object.date = Date.now();
      if (typeof object.level === 'number')
        object.level = convertLogNumber(object.level);
      if (!object.level) object.level = 'info';

      const output: string[] = [];

      for (const key of template) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const value = get(object, key);
        if (!value) continue;
        const formatter = formatters[key];
        if (!formatter) continue;
        output.push(formatter(value, object));
      }

      for (const key of template) {
        unset(object, key);
      }

      if (object.req && isEmpty(object.req)) unset(object, 'req');
      if (object.res && isEmpty(object.res)) unset(object, 'res');

      if (isObject(object) && !isEmpty(object))
        output.push(formatters.extraFields(object, {theme}));

      let outputString = output.filter(Boolean).join(' ');

      if (!outputString.endsWith(nl)) outputString += nl;

      return outputString;
    } catch (error: unknown) {
      console.log(error);
    }
  };
}

export default prettify;
