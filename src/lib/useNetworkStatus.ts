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

const initialStatus: NetworkStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSlowConnection: false,
  type: 'unknown',
};

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
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

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
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

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
