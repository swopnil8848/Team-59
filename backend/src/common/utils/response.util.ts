import { ResponseBody } from "../interfaces/response-body.interface";

export function createResponse<T>(
  data: T,
  message: string,
  meta?: Record<string, unknown>
): ResponseBody<T> {
  return {
    data,
    message,
    meta
  };
}
