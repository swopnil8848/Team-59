import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "../interfaces/api-response.interface";

type ResponseBody<T> = {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<ResponseBody<T> | T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<ResponseBody<T> | T>
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        if (this.isWrappedResponse(value)) {
          return {
            success: true,
            message: value.message ?? "Request successful",
            data: value.data,
            meta: value.meta
          };
        }

        return {
          success: true,
          message: "Request successful",
          data: value
        };
      })
    );
  }

  private isWrappedResponse(value: ResponseBody<T> | T): value is ResponseBody<T> {
    return typeof value === "object" && value !== null && "data" in value;
  }
}
