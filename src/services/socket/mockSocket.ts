// Re-export canonical mock classes & types from src/test/mockSocket to maintain 100% test compatibility
export * from '../../test/mockSocket';
import { MockSocketServer } from '../../test/mockSocket';

let sharedServer: MockSocketServer | null = null;

export function getSharedMockServer(): MockSocketServer {
  if (!sharedServer) {
    sharedServer = new MockSocketServer();
  }
  return sharedServer;
}

export function resetSharedMockServer(): void {
  if (sharedServer) {
    sharedServer.reset();
    sharedServer = null;
  }
}
