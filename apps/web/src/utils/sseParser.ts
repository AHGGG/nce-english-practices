import {
  isSSEResponse,
  parseJSONSSEStream,
  parseTextSSEStream,
} from "@nce/shared";

const sseParser = {
  parseJSONSSEStream,
  parseTextSSEStream,
  isSSEResponse,
};

export { parseJSONSSEStream, parseTextSSEStream, isSSEResponse };
export default sseParser;
