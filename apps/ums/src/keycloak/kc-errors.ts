import { ConflictException, NotFoundException, ForbiddenException, BadGatewayException, UnauthorizedException, HttpException } from '@nestjs/common';

// Attempt to extract status code from axios-like error
function extractStatus(e: any): number | undefined {
  return e?.response?.status ?? e?.status;
}

export function mapKeycloakError(e: any, context: string): HttpException {
  const status = extractStatus(e);
  const msg = e?.response?.data?.errorMessage || e?.message || context;
  switch (status) {
    case 401:
      return new UnauthorizedException(msg);
    case 403:
      return new ForbiddenException(msg);
    case 404:
      return new NotFoundException(msg);
    case 409:
      return new ConflictException(msg);
    default:
      return new BadGatewayException(context + ': ' + msg);
  }
}

// Helper to wrap a promise-returning function, mapping errors
export async function wrapKc<T>(fn: () => Promise<T>, context: string): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    throw mapKeycloakError(e, context);
  }
}
