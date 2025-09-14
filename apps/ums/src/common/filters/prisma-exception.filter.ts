import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** Maps Prisma known errors to HTTP responses. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const { code, meta, message } = exception;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Database Error';

    // Common Prisma error codes mapping
    switch (code) {
      case 'P2002': // Unique constraint failed
        status = HttpStatus.CONFLICT;
        error = 'Unique constraint violation';
        break;
      case 'P2003': // Foreign key constraint
        status = HttpStatus.BAD_REQUEST;
        error = 'Foreign key constraint failed';
        break;
      case 'P2025': // Record not found
        status = HttpStatus.NOT_FOUND;
        error = 'Record not found';
        break;
      default:
        status = HttpStatus.BAD_REQUEST;
        error = 'Invalid request';
    }

    this.logger.warn(`${code} ${error} ${message}`);

    res.status(status).json({
      statusCode: status,
      error,
      code,
      meta,
      timestamp: new Date().toISOString(),
    });
  }
}
