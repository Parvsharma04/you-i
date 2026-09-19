import { HttpException, HttpStatus } from '@nestjs/common';
import { JoinSessionErrorCode } from '@youandi/shared';

const STATUS_BY_CODE: Record<JoinSessionErrorCode, HttpStatus> = {
  CODE_NOT_FOUND: HttpStatus.NOT_FOUND,
  CODE_EXPIRED: HttpStatus.BAD_REQUEST,
  SESSION_FULL: HttpStatus.BAD_REQUEST,
  SESSION_FINISHED: HttpStatus.BAD_REQUEST,
  ALREADY_JOINED: HttpStatus.OK,
  SELF_JOIN: HttpStatus.BAD_REQUEST,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
};

const MESSAGE_BY_CODE: Record<JoinSessionErrorCode, string> = {
  CODE_NOT_FOUND: 'Room code not found',
  CODE_EXPIRED: 'Room code has expired',
  SESSION_FULL: 'Session is already full',
  SESSION_FINISHED: 'Session has already finished',
  ALREADY_JOINED: 'Device is already a player in this session',
  SELF_JOIN: 'Host cannot join their own session',
  RATE_LIMITED: 'Too many failed join attempts',
};

/**
 * Strongly-typed error for POST /session/join. The response body always
 * contains a `code` the client can switch on, never a generic message.
 */
export class JoinSessionException extends HttpException {
  constructor(public readonly errorCode: JoinSessionErrorCode) {
    super(
      {
        code: errorCode,
        message: MESSAGE_BY_CODE[errorCode],
      },
      STATUS_BY_CODE[errorCode],
    );
  }
}
