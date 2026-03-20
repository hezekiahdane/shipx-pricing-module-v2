import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { ApiResponse } from './response';
import { errorResponse } from './response';
import { AppError } from './errors';
import { validateCsrfOrigin } from '@/lib/core/security/csrf';
import {
  checkRateLimit,
  type RateLimitPreset,
} from '@/lib/core/security/arcjet';

interface WithApiOptions<TSchema extends z.ZodType = z.ZodType> {
  schema?: TSchema;
  rateLimit?: RateLimitPreset;
  csrf?: boolean;
  auth?: boolean;
}

interface ApiContext<T = unknown> {
  data: T;
  request: Request;
  user?: unknown;
}

type ApiHandler<T = unknown> = (
  context: ApiContext<T>,
) => Promise<ApiResponse<unknown>>;

export function withApi<TSchema extends z.ZodType>(
  options: WithApiOptions<TSchema>,
  handler: ApiHandler<z.infer<TSchema>>,
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      // 1. CSRF check (default: true for mutations)
      const shouldCheckCsrf = options.csrf ?? true;
      if (shouldCheckCsrf && !validateCsrfOrigin(request)) {
        return NextResponse.json(errorResponse('Forbidden'), { status: 403 });
      }

      // 2. Rate limiting
      if (options.rateLimit) {
        const ip =
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          'anonymous';
        const { allowed } = await checkRateLimit(ip, options.rateLimit);
        if (!allowed) {
          return NextResponse.json(
            errorResponse('Too many requests. Please try again later.'),
            { status: 429, headers: { 'Retry-After': '60' } },
          );
        }
      }

      // 3. Auth check (requires auth module)
      let user: unknown = undefined;
      if (options.auth) {
        try {
          // Dynamic path prevents Vite from resolving at transform time
          const authPath = '@/lib/auth';
          const { createServerClient } = await (import(
            /* @vite-ignore */ authPath
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as Promise<any>);
          const supabase = await createServerClient();
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (!authUser) {
            return NextResponse.json(errorResponse('Unauthorized'), {
              status: 401,
            });
          }
          user = authUser;
        } catch {
          return NextResponse.json(
            errorResponse('Auth module not configured'),
            { status: 500 },
          );
        }
      }

      // 4. Parse and validate body
      let data: z.infer<TSchema> = undefined as z.infer<TSchema>;
      if (options.schema) {
        const body = await request.json();
        const result = options.schema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            {
              ...errorResponse('Validation failed'),
              details: result.error.flatten(),
            },
            { status: 422 },
          );
        }
        data = result.data;
      }

      // 5. Execute handler
      const response = await handler({ data, request, user });
      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(errorResponse(error.message), {
          status: error.statusCode,
        });
      }

      console.error('API error:', error);
      return NextResponse.json(errorResponse('Internal server error'), {
        status: 500,
      });
    }
  };
}
