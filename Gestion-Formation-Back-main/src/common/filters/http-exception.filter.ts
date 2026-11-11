import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

// Messages lisibles pour les codes HTTP courants
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Données invalides ou manquantes',
  401: 'Authentification requise — veuillez vous connecter',
  403: 'Accès refusé — vous n\'avez pas les droits nécessaires',
  404: 'Ressource introuvable',
  409: 'Conflit — cette ressource existe déjà',
  422: 'Données non traitables',
  429: 'Trop de requêtes — veuillez réessayer dans quelques instants',
  500: 'Erreur interne du serveur',
  503: 'Service temporairement indisponible',
};

// Messages lisibles pour les erreurs MySQL (QueryFailedError)
const MYSQL_ERROR_MESSAGES: Record<string, string> = {
  ER_DUP_ENTRY: 'Cette entrée existe déjà (doublon détecté)',
  ER_NO_REFERENCED_ROW_2: 'Référence invalide — l\'élément lié n\'existe pas',
  ER_ROW_IS_REFERENCED_2: 'Suppression impossible — cet élément est utilisé ailleurs',
  ER_DATA_TOO_LONG: 'La valeur saisie est trop longue pour ce champ',
  ER_TRUNCATED_WRONG_VALUE: 'Format de valeur incorrect',
  ER_BAD_NULL_ERROR: 'Un champ obligatoire est manquant',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = HTTP_ERROR_MESSAGES[500];
    let error = 'Internal Server Error';
    let details: string | undefined;

    // ── HttpException (NestJS standard) ──────────────────────────────────────
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        // ValidationPipe retourne un tableau de messages
        message = resp.message ?? HTTP_ERROR_MESSAGES[status] ?? exception.message;
        error = resp.error ?? exception.name;
      }

      // Ajouter un message lisible si le message d'origine est trop technique
      if (typeof message === 'string' && message.length > 200) {
        details = message;
        message = HTTP_ERROR_MESSAGES[status] ?? 'Une erreur est survenue';
      }
    }

    // ── TypeORM : QueryFailedError (erreurs MySQL) ────────────────────────────
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      error = 'Database Error';
      const mysqlCode = (exception as any).code as string;
      message = MYSQL_ERROR_MESSAGES[mysqlCode]
        ?? 'Erreur lors de l\'opération sur la base de données';
      details = exception.message;
      this.logger.error(`DB Error [${mysqlCode}]: ${exception.message}`);
    }

    // ── TypeORM : EntityNotFoundError ────────────────────────────────────────
    else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      error = 'Not Found';
      message = 'Ressource introuvable';
      details = exception.message;
    }

    // ── Erreur inconnue ───────────────────────────────────────────────────────
    else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      message = HTTP_ERROR_MESSAGES[500];
      details = process.env.NODE_ENV === 'development' ? exception.message : undefined;
    }

    // Logguer les erreurs 5xx
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status} | ${Array.isArray(message) ? message.join(', ') : message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      ...(details && process.env.NODE_ENV === 'development' ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
