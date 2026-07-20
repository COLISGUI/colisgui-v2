import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

// Filtre global : réponse d'erreur cohérente, masque les détails internes en production.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? exception.getResponse() : null;

    let message: string | string[] = 'Erreur interne du serveur';
    if (isHttp) {
      message = typeof payload === 'string' ? payload : (payload as any)?.message ?? exception.message;
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url}`, exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
