import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

interface HttpError {
  statusCode: number;
  code: string;
  message: string;
}

function isFastifyError(err: unknown): err is FastifyError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode: unknown }).statusCode === 'number'
  );
}

const errorHandlerPlugin = async (app: FastifyInstance) => {
  app.setErrorHandler(async (err: Error, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = isFastifyError(err) && err.statusCode ? err.statusCode : 500;

    const isValidation = isFastifyError(err) && err.code === 'FST_ERR_VALIDATION';

    const payload: HttpError = {
      statusCode: isValidation ? 400 : statusCode,
      code: isFastifyError(err) && err.code ? err.code : 'INTERNAL_ERROR',
      message: statusCode >= 500 && !isValidation
        ? 'Internal Server Error'
        : err.message,
    };

    request.log.error(
      { err, statusCode: payload.statusCode, code: payload.code },
      'Request failed',
    );

    await reply.status(payload.statusCode).send(payload);
  });
};

export default fp(errorHandlerPlugin, { name: 'errorHandler' });