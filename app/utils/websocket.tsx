"use client";

import { atom, useAtom } from "jotai";
import { useEffect, useCallback, useRef } from "react";

// Types (matching backend)
export type PlayerStats = {
  wpm: number;
  accuracy: number;
  error: number;
};

declare global {
  interface Window {
    wsConnection: WebSocket | null;
    wsConnectionKey: string | null;
  }
}

export type WebSocketMessage =
  | { type: "player_list"; payload: string[] }
  | { type: "countdown"; payload: { seconds: number } }
  | { type: "start"; payload: null }
  | { type: "stats_update"; payload: Record<string, PlayerStats> }
  | { type: "game_over"; payload: { winner: string; stats: Record<string, PlayerStats>; reason?: string } };

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

export const wsConnectionAtom = atom<WebSocket | null>(null);
export const wsConnectedAtom = atom<boolean>(false);
export const wsErrorAtom = atom<string | null>(null);
export const wsConnectionKeyAtom = atom<string>("");

// Manager atom for creating/managing the connection
export const wsManagerAtom = atom(
  (get) => get(wsConnectionAtom),
  (get, set, room_code: string, username: string) => {
    const connectionKey = `${room_code}-${username}`;
    const currentKey = get(wsConnectionKeyAtom);
    
    // Check if we already have the same connection key
    if (currentKey === connectionKey && window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
      console.log(`Reusing existing WebSocket connection for ${connectionKey}`);
      set(wsConnectionAtom, window.wsConnection);
      set(wsConnectedAtom, true);
      return window.wsConnection;
    }
    
    console.log(`Creating new WebSocket connection - room: ${room_code}, user: ${username}`);
    
    // Close existing connection if it's different
    const existingWs = get(wsConnectionAtom);
    if (existingWs && existingWs.readyState !== WebSocket.CLOSED && currentKey !== connectionKey) {
      console.log("Closing existing WebSocket connection");
      existingWs.close(1000, "New connection requested");
    }

    set(wsConnectionKeyAtom, connectionKey);
    set(wsErrorAtom, null);

    let reconnectAttempts = 0;
    let reconnectTimeout: number;
    let isManualClose = false;

    const connectWebSocket = () => {
      const wsUrl = `ws://${process.env.NEXT_PUBLIC_WS_URL || "localhost:8080"}/ws/${encodeURIComponent(room_code)}?username=${encodeURIComponent(username)}`;
      console.log(`Connecting to: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);

      window.wsConnection = ws;
      window.wsConnectionKey = connectionKey;

      // Connection timeout
      const connectionTimeout = window.setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log("Connection timeout - closing socket");
          ws.close();
          set(wsErrorAtom, "Connection timeout");
        }
      }, 8000);

      ws.onopen = () => {
        window.clearTimeout(connectionTimeout);
        set(wsConnectedAtom, true);
        set(wsErrorAtom, null);
        reconnectAttempts = 0;
        console.log("WebSocket connected successfully");
      };

      ws.onclose = (event) => {
        window.clearTimeout(connectionTimeout);
        set(wsConnectedAtom, false);
        
        if (window.wsConnectionKey === connectionKey) {
          window.wsConnection = null;
          window.wsConnectionKey = null;
        }
        
        if (isManualClose) {
          console.log("Manual close - not reconnecting");
          return;
        }
        
        let errorMessage = `WebSocket disconnected: code=${event.code}`;
        if (event.reason) errorMessage += `, reason=${event.reason}`;
        
        console.log(`${errorMessage}`);

        switch (event.code) {
          case 1000:
            console.log("Normal closure");
            return;
          case 1006:
            set(wsErrorAtom, "Connection lost - server may be down");
            break;
          case 1002:
            set(wsErrorAtom, "Protocol error");
            break;
          case 1003:
            set(wsErrorAtom, "Unsupported data");
            break;
          default:
            set(wsErrorAtom, errorMessage);
        }

        // Only attempt reconnection for certain error codes and if still the active connection
        if (event.code !== 1000 && event.code !== 1003 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && window.wsConnectionKey === connectionKey) {
          reconnectAttempts++;
          console.log(`Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          reconnectTimeout = window.setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log("Max reconnection attempts reached");
          set(wsErrorAtom, "Failed to connect after multiple attempts");
          if (window.wsConnectionKey === connectionKey) {
            set(wsConnectionKeyAtom, "");
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        set(wsErrorAtom, "WebSocket connection error");
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log("WebSocket message received:", data.type, data.payload);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      set(wsConnectionAtom, ws);
      return ws;
    };

    const ws = connectWebSocket();

    return () => {
      console.log("Cleaning up WebSocket connection");
      isManualClose = true;
      window.clearTimeout(reconnectTimeout);
      
      if (window.wsConnectionKey === connectionKey) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "Component unmounted");
        }
        window.wsConnection = null;
        window.wsConnectionKey = null;
        set(wsConnectionKeyAtom, "");
      }
    };
  }
);

// Custom hook for subscribing to messages
export const useWebSocketMessage = <T extends WebSocketMessage["payload"]>(
  messageType: WebSocketMessage["type"],
  handler: (payload: T) => void
) => {
  const [ws] = useAtom(wsConnectionAtom);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const messageHandler = useCallback(
    (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.type === messageType) {
          console.log(`Handling ${messageType} message:`, data.payload);
          handlerRef.current(data.payload as T);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    },
    [messageType]
  );

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", messageHandler);
    return () => ws.removeEventListener("message", messageHandler);
  }, [ws, messageHandler]);
};

// Hook for connecting to the WebSocket
export const useWebSocketConnect = () => {
  const [, setWs] = useAtom(wsManagerAtom);
  const [connected] = useAtom(wsConnectedAtom);
  const [error] = useAtom(wsErrorAtom);
  const connectCalledRef = useRef<string>("");

  const connect = useCallback((room_code: string, username: string) => {
    const connectionKey = `${room_code}-${username}`;
    
    // Prevent multiple calls with same parameters
    if (connectCalledRef.current === connectionKey) {
      console.log(`Connect already called for ${connectionKey}, ignoring duplicate`);
      return;
    }
    
    connectCalledRef.current = connectionKey;
    console.log(`Initiating connection - room: ${room_code}, user: ${username}`);
    setWs(room_code, username);
  }, [setWs]);

  const disconnect = useCallback(() => {
    connectCalledRef.current = "";
  }, []);

  return { connect, disconnect, connected, error };
};

export const sendWebSocketMessage = (type: string, payload: any) => {
  if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
    const message = { type, payload };
    window.wsConnection.send(JSON.stringify(message));
    console.log("Sent WebSocket message:", type, payload);
  } else {
    console.warn("WebSocket not connected, cannot send message:", type, payload);
  }
};