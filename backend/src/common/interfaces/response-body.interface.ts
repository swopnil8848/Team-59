export interface ResponseBody<T> {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}
