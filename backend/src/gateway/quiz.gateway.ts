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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string },
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
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId: string;
      playerId: string;
      questionId: number;
      answerIndex: number;
    },
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
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; playerId: string },
  ): void {
    client.to(data.sessionId).emit('playerComplete', {
      playerId: data.playerId,
    });
  }

  // Server-side method to emit results ready
  emitResultsReady(sessionId: string, results: unknown): void {
    this.server.to(sessionId).emit('resultsReady', results);
  }
}
