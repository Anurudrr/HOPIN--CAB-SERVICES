/**
 * Hook to detect network status and connection quality
 * Used for implementing offline-first UI and retry strategies
 */

import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  type?: string;
  downlink?: number;
}

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  addEventListener: (type: "change", listener: () => void) => void;
  removeEventListener: (type: "change", listener: () => void) => void;
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
};

const initialStatus: NetworkStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSlowConnection: false,
  type: 'unknown',
};

function getNetworkConnection(): NetworkConnection | undefined {
  if (typeof navigator === "undefined") return undefined;

  const browserNavigator = navigator as NavigatorWithConnection;
  return (
    browserNavigator.connection ??
    browserNavigator.mozConnection ??
    browserNavigator.webkitConnection
  );
}

/**
 * Monitor network connectivity and connection quality
 * 
 * @returns Network status object with isOnline, isSlowConnection, and connection info
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const network = useNetworkStatus();
 *   
 *   if (!network.isOnline) {
 *     return <OfflineMessage />;
 *   }
 *   
 *   if (network.isSlowConnection) {
 *     return <LowQualityWarning />;
 *   }
 *   
 *   return <NormalContent />;
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(initialStatus);

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    const handleConnectionChange = () => {
      const connection = getNetworkConnection();

      if (connection) {
        const effectiveType = connection.effectiveType;
        const isSlowConnection =
          effectiveType === '2g' || effectiveType === '3g' || effectiveType === 'slow-2g';

        setStatus({
          isOnline: navigator.onLine,
          isSlowConnection,
          type: effectiveType,
          downlink: connection.downlink,
        });
      }
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = getNetworkConnection();

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
      // Get initial state
      handleConnectionChange();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
}
