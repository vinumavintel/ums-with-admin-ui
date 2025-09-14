import { HttpException } from '@nestjs/common';

export interface SuccessEnvelope<T> { success: true; data: T }
export interface ErrorEnvelope { success: false; error: { message: string; code?: string; details?: any } }

export function success<T>(data: T): SuccessEnvelope<T> {
  return { success: true, data };
}

export function error(message: string, code?: string, details?: any): ErrorEnvelope {
  return { success: false, error: { message, code, details } };
}

export function toHttpError(e: any, defaultStatus = 500): HttpException {
  const status = e?.status || e?.statusCode || defaultStatus;
  const msg = e?.message || 'Internal Server Error';
  return new HttpException(error(msg, e?.code, e?.details), status);
}
