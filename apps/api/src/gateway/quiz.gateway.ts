import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  JoinRoomPayload,
  QuizCompletePayload,
  ResultsReadyPayload,
  ServerToClientEvents,
  SubmitAnswerSocketPayload,
} from '@youandi/shared';
import { PrismaService } from '../prisma/prisma.service';
import { buildCorsOptions } from '../common/cors.config';

type QuizServer = Server<ClientToServerEvents, ServerToClientEvents>;
type QuizSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({
  cors: buildCorsOptions(),
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: QuizServer;

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: QuizSocket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: QuizSocket): void {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Same authorization rule as the HTTP PlayerGuard: the caller's playerId
  // must belong to the session before it can join the room and observe
  // game events. Anything else and the socket is disconnected outright —
  // there is no room to fall back into.
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: QuizSocket,
    @MessageBody() data: JoinRoomPayload,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: data.sessionId },
      include: { players: true },
    });

    const belongsToSession =
      !!session &&
      session.players.some((player) => player.playerId === data.playerId);

    if (!belongsToSession) {
      console.warn(
        `Rejected joinRoom for session ${data.sessionId}: player ${data.playerId} does not belong`,
      );
      client.disconnect(true);
      return;
    }

    await client.join(data.sessionId);
    console.log(`Player ${data.playerId} joined room ${data.sessionId}`);

    // Notify everyone in the room (including the joining player) so both
    // host and guest can react to the same event and navigate together.
    this.server.to(data.sessionId).emit('playerJoined', {
      playerId: data.playerId,
    });
  }

  @SubscribeMessage('submitAnswer')
  handleSubmitAnswer(
    @ConnectedSocket() client: QuizSocket,
    @MessageBody() data: SubmitAnswerSocketPayload,
  ): void {
    // Notify others that an answer was submitted
    client.to(data.sessionId).emit('answerSubmitted', {
      playerId: data.playerId,
      questionId: data.questionId,
      answerIndex: data.answerIndex,
    });
  }

  @SubscribeMessage('quizComplete')
  handleQuizComplete(
    @ConnectedSocket() client: QuizSocket,
    @MessageBody() data: QuizCompletePayload,
  ): void {
    client.to(data.sessionId).emit('playerComplete', {
      playerId: data.playerId,
    });
  }

  // Server-side method to emit results ready. Never invoked anywhere in
  // apps/api today — see MIGRATION-AUDIT.md §6 DRIFT #1.
  emitResultsReady(sessionId: string, results: ResultsReadyPayload): void {
    this.server.to(sessionId).emit('resultsReady', results);
  }
}
