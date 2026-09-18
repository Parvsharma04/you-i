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

type QuizServer = Server<ClientToServerEvents, ServerToClientEvents>;
type QuizSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: QuizServer;

  handleConnection(client: QuizSocket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: QuizSocket): void {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: QuizSocket,
    @MessageBody() data: JoinRoomPayload,
  ): void {
    client.join(data.sessionId);
    console.log(`Player ${data.playerId} joined room ${data.sessionId}`);

    // Notify others in the room
    client.to(data.sessionId).emit('playerJoined', {
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
