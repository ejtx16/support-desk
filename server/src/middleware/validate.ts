import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Validates (and coerces) a request segment with a zod schema.
 * The parsed value replaces the original so handlers receive typed, sanitized data.
 * Zod errors are turned into 400 responses by the error handler.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);

    if (source === 'query') {
      // req.query is a getter in Express 5 / some setups; define it explicitly.
      Object.defineProperty(req, 'query', { value: result.data, writable: true });
    } else {
      req[source] = result.data;
    }
    return next();
  };
}
