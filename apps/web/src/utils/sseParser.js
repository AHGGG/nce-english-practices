export { parseJSONSSEStream, parseTextSSEStream, isSSEResponse } from '@nce/shared';
export default {
    parseJSONSSEStream: (await import('@nce/shared')).parseJSONSSEStream,
    parseTextSSEStream: (await import('@nce/shared')).parseTextSSEStream,
    isSSEResponse: (await import('@nce/shared')).isSSEResponse
};
