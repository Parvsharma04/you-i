import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto, JoinSessionDto } from './session.dto';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('create')
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto);
  }

  @Post('join')
  async join(@Body() dto: JoinSessionDto) {
    return this.sessionService.join(dto.sessionId);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.sessionService.getSession(id);
  }
}
