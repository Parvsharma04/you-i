import { Controller, Get, Headers, BadRequestException } from '@nestjs/common';
import { SessionService } from './session.service';
import { DEVICE_ID_HEADER } from '@youandi/shared';

function requireDeviceId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || value.length === 0) {
    throw new BadRequestException(`${DEVICE_ID_HEADER} header is required`);
  }
  return value;
}

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('mine')
  async findMine(
    @Headers(DEVICE_ID_HEADER) deviceIdHeader: string | string[] | undefined,
  ) {
    const deviceId = requireDeviceId(deviceIdHeader);
    return this.sessionService.findMine(deviceId);
  }
}
