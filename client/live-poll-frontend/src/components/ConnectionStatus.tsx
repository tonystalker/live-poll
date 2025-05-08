import React from 'react';
import { Socket } from 'socket.io-client';

interface ConnectionStatusProps {
  socket: Socket | null;
  error: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ socket, error }) => {
  const connectionStatus = socket ? 'Connected' : 'Disconnected';

  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">Socket Status: {connectionStatus}</div>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
    </div>
  );
};

export default ConnectionStatus;
