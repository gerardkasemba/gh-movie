import { Server } from 'socket.io';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';

const rooms: { [key: string]: { name: string } } = {};

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    const httpServer = createServer();
    const io = new Server(httpServer, {
      cors: { origin: '*' },
    });

    io.on('connection', (socket) => {
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

    res.socket.server.io = io;
  }
  res.end();
};

export default handler;