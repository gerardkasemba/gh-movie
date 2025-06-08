'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import { io, Socket } from 'socket.io-client';

export default function Room() {
  const { roomId } = useParams();
  const [roomName, setRoomName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    socketRef.current = io({
      path: '/api/socket',
      transports: ['websocket'],
    });

    if (videoRef.current && !playerRef.current) {
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        sources: videoUrl ? [{ src: videoUrl, type: 'video/mp4' }] : [],
      });

      playerRef.current.on('play', () => {
        if (isHost) {
          socketRef.current?.emit('video-event', {
            roomId,
            event: 'play',
            time: playerRef.current?.currentTime() || 0,
          });
        }
      });

      playerRef.current.on('pause', () => {
        if (isHost) {
          socketRef.current?.emit('video-event', {
            roomId,
            event: 'pause',
            time: playerRef.current?.currentTime() || 0,
          });
        }
      });

      playerRef.current.on('seeked', () => {
        if (isHost) {
          socketRef.current?.emit('video-event', {
            roomId,
            event: 'seek',
            time: playerRef.current?.currentTime() || 0,
          });
        }
      });
    }

    socketRef.current.on('room-details', ({ roomName }: { roomName: string }) => {
      setRoomName(roomName);
    });

    socketRef.current.on('video-event', (data: { event: string; time: number }) => {
      if (!isHost && playerRef.current) {
        if (data.event === 'play') {
          playerRef.current.currentTime(data.time);
          playerRef.current.play();
        } else if (data.event === 'pause') {
          playerRef.current.pause();
          playerRef.current.currentTime(data.time);
        } else if (data.event === 'seek') {
          playerRef.current.currentTime(data.time);
        }
      }
    });

    socketRef.current.on('set-video', (url: string) => {
      setVideoUrl(url);
      if (playerRef.current) {
        playerRef.current.src({ type: 'video/mp4', src: url });
      }
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStreamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.play();
      }
    });

    socketRef.current.emit('join-room', roomId, Date.now().toString());
    socketRef.current.on('user-connected', () => {
      if (!isHost) setIsHost(true);
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, isHost, videoUrl]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    if (isHost && url) {
      setVideoUrl(url);
      if (playerRef.current) {
        playerRef.current.src({ type: 'video/mp4', src: url });
      }
      socketRef.current?.emit('set-video', { roomId, url });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">Room: {roomName || roomId}</h1>
      <div className="relative w-full max-w-4xl">
        <div data-vjs-player>
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered"
          />
        </div>
        <video
          ref={webcamRef}
          autoPlay
          muted
          className="absolute bottom-4 right-4 w-32 h-24 rounded-lg shadow-md border-2 border-gray-700"
        />
      </div>
      <div className="mt-4 flex gap-4">
        {isHost && (
          <input
            type="text"
            placeholder="Enter video URL (e.g., .mp4)"
            onChange={handleVideoSelect}
            className="p-2 rounded bg-gray-700 text-white"
          />
        )}
        <button
          onClick={toggleMute}
          className={`${
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          } text-white font-semibold py-2 px-4 rounded`}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  );
}