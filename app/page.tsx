'use client';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [shortId, setShortId] = useState('');
  const [error, setError] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket',
      transports: ['websocket'],
    });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
      setError('Failed to connect to server. Please try again.');
    });

    socketInstance.on('room-created', ({ shortId, roomName }: { shortId: string; roomName: string }) => {
      console.log('Room created:', { shortId, roomName });
      setShortId(shortId);
      setError('');
    });

    socketInstance.on('error', (message: string) => {
      console.error('Server error:', message);
      setError(message);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const createRoom = () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    if (!socket || !socket.connected) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }
    socket.emit('create-room', roomName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-center">Movie Night</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="text"
          placeholder="Enter Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white mb-4"
        />
        <button
          onClick={createRoom}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mb-4"
        >
          Create Room
        </button>
        {shortId && (
          <div className="text-center">
            <p>Room: {roomName}</p>
            <p>Share this link:</p>
            <Link href={`/room/${shortId}`} className="text-blue-400 underline">
              {`${window.location.origin}/room/${shortId}`}
            </Link>
          </div>
        )}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={shortId}
            onChange={(e) => setShortId(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white mb-2"
          />
          <Link href={`/room/${shortId}`}>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded">
              Join Room
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}