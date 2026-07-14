import { io } from 'socket.io-client';

const SOCKET_URL = 'https://service-backend-jhq0.onrender.com';

export const socket = io(SOCKET_URL, {
  autoConnect: true
});
