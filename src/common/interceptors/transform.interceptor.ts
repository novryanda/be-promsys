import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta: {
    timestamp: string;
    path: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped (WebResponse style)
        if (data && typeof data === 'object' && 'data' in data) {
          return {
            ...data,
            meta: {
              timestamp: new Date().toISOString(),
              path: request.url,
              ...(data.paging ? { paging: data.paging } : {}),
            },
          };
        }

        // Standard wrap
        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
          },
        };
      }),
    );
  }
}
