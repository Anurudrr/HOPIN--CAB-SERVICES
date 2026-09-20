import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, getPushSubscriptions } from "../../lib/platformApi";
import { toast } from "../../lib/toast";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

export const PushNotificationButton = () => {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [subscribing, setSubscribing] = React.useState(false);

  React.useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const subscriptions = await getPushSubscriptions();
      setIsSubscribed(subscriptions.length > 0);
    } catch (error) {
      console.error("Failed to check push subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermissionAndSubscribe = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications");
      return;
    }

    if (Notification.permission === "denied") {
      toast.error("Notifications are blocked. Enable them in browser settings.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error("Notification permission denied");
      return;
    }

    await subscribe();
  };

  const subscribe = async () => {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ""
        ),
      });

      await subscribeToPushNotifications({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
        },
      });

      setIsSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (error) {
      console.error("Failed to subscribe:", error);
      toast.error("Failed to enable notifications");
    } finally {
      setSubscribing(false);
    }
  };

  const unsubscribe = async () => {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPushNotifications(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
      toast.error("Failed to disable notifications");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 size={16} className="animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={isSubscribed ? "outline" : "secondary"}
      size="sm"
      onClick={isSubscribed ? unsubscribe : requestPermissionAndSubscribe}
      disabled={subscribing}
      className={cn("gap-2", isSubscribed && "bg-green-50 border-green-300 text-green-900")}
    >
      {subscribing ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isSubscribed ? (
        <BellOff size={16} />
      ) : (
        <Bell size={16} />
      )}
      <span className="hidden sm:inline">
        {isSubscribed ? "Notifications On" : "Enable Notifications"}
      </span>
    </Button>
  );
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}