import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: { error: { code: err.code, message: err.message, details: err.details } },
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.flatten().fieldErrors,
        },
      },
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return { status: 409, body: { error: { code: 'CONFLICT', message: 'Resource already exists' } } };
    }
    if (err.code === 'P2025') {
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Resource not found' } } };
    }
  }

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    return { status: 400, body: { error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } } };
  }

  return {
    status: 500,
    body: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' } },
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const { status, body } = toErrorResponse(err);
  if (status >= 500) console.error(err);
  res.status(status).json(body);
}
