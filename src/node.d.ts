declare module "async-csp";

// declare module "async-csp" {
//     export default class Channel {
//         constructor(...argv);
//         static DONE;
//         static from(iterable: Iterable<any>, keepOpen?: boolean);
//         static close(ch: Channel, all?: boolean);
//         static empty(ch: Channel);
//         static put(ch: Channel, val): Promise<any>;
//         static take(ch: Channel): Promise<any>;
//         static tail(ch: Channel, val): Promise<any>;
//         static produce(ch: Channel, producer);
//         static consume(ch: Channel, consumer);
//         static done(ch: Channel): Promise<any>;
//         static pipeline(...args);
//         static pipe(parent, ...channels);
//         static merge(...channels);
//         static unpipe(parent, ...channels);
//         state;
//         length;
//         size;
//         close(all?: boolean);
//         empty();
//         put(val): Promise<any>;
//         take(): Promise<any>;
//         tail(val);
//         produce(producer);
//         consume(consumer);
//         done(): Promise<any>;
//         pipe(...channels);
//         merge(...channels);
//         unpipe(...channels);
//     }
//     export function timeout(delay?: number): Promise<any>
// }
