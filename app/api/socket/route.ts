import { Server, Socket } from 'socket.io';
import { nanoid } from 'nanoid';

// Store rooms and Socket.IO instance globally
const rooms: { [key: string]: { name: string } } = {};
let io: Server | null = null;

export async function GET() {
  try {
    // Check if Socket.IO is already initialized
    if (!io) {
      // Create a new Socket.IO server instance
      io = new Server({
        path: '/api/socket',
        cors: { origin: '*' },
      });

      io.on('connection', (socket: Socket) => {
        console.log('User connected:', socket.id);

        socket.on('create-room', (roomName: string) => {
          if (!roomName || typeof roomName !== 'string') {
            socket.emit('error', 'Invalid room name');
            return;
          }
          const shortId = nanoid(6);
          rooms[shortId] = { name: roomName };
          socket.join(shortId);
          console.log('Room created:', { shortId, roomName });
          socket.emit('room-created', { shortId, roomName });
        });

        socket.on('join-room', (shortId: string, userId: string) => {
          if (rooms[shortId]) {
            socket.join(shortId);
            socket.to(shortId).emit('user-connected', userId);
            socket.emit('room-details', { shortId, roomName: rooms[shortId].name });
          } else {
            socket.emit('error', 'Room not found');
          }
        });

        socket.on('set-video', (data: { roomId: string; url: string }) => {
          socket.to(data.roomId).emit('set-video', data.url);
        });

        socket.on('video-event', (data: { roomId: string; event: string; time: number }) => {
          socket.to(data.roomId).emit('video-event', { event: data.event, time: data.time });
        });

        socket.on('disconnect', () => {
          console.log('User disconnected:', socket.id);
        });
      });
    }

    return new Response('Socket.IO server initialized', { status: 200 });
  } catch (error) {
    console.error('Socket.IO initialization error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST() {
  return new Response('Method not allowed', { status: 405 });
}