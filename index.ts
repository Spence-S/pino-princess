import {Transform} from 'node:stream';
import pump from 'pump';
import abstractTransport, {type OnUnknown} from 'pino-abstract-transport';
import type {SonicBoom, SonicBoomOpts} from 'sonic-boom';
import prettify from './lib/prettify.js';
import buildSafeSonicBoom from './lib/build-safe-sonic-boom.js';
import type {PrettifyOptions} from './lib/utils/types.js';

function build(
  options: PrettifyOptions &
    SonicBoomOpts & {destination?: Transform & OnUnknown},
): Transform & OnUnknown {
  const pretty = prettify(options);

  function transform(source: Transform & OnUnknown): void {
    const stream = new Transform({
      objectMode: true,
      autoDestroy: true,
      transform(chunk: string, enc: string, cb) {
        const line = pretty(chunk);
        cb(null, line);
      },
    });

    let destination: Transform | (SonicBoom & OnUnknown);

    if (
      (typeof options?.destination === 'object' &&
        typeof options?.destination.write === 'function') ||
      options.destination instanceof Transform
    ) {
      destination = options.destination;
    } else {
      destination = buildSafeSonicBoom({
        dest: options.destination ?? 1,
        append: options.append,
        mkdir: options.mkdir,
        sync: options.sync,
      });
    }

    source.on('unknown', function (line) {
      destination.write(line + '\n');
    });

    pump(source, stream, destination as Transform);
  }

  return abstractTransport(transform, {parse: 'lines'});
}

export {build};
export default build;
export {default as prettify} from './lib/prettify.js';
export type {PrettifyOptions as Configuration} from './lib/utils/types.js';
