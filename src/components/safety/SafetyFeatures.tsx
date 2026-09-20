import * as React from "react";
import { AlertTriangle, Shield, Share2, Phone, UserPlus, X, Loader2, CheckCircle, MapPin, Bell } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { triggerSOS, getEmergencyContacts, addEmergencyContact, updateEmergencyContact, deleteEmergencyContact, getSOSAlerts, subscribeToSOSAlerts } from "../../lib/platformApi";
import { toast } from "../../lib/toast";
import { cn } from "../../lib/utils";
import { Button } from "./Button";
import { Avatar } from "./Avatar";

const emergencyContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Enter a valid phone number"),
  relationship: z.string().optional(),
  is_primary: z.boolean().default(false),
});

type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;

interface SafetyButtonProps {
  bookingId?: string | null;
  lat?: number;
  lng?: number;
  address?: string;
  className?: string;
}

export const SafetyButton = ({ bookingId, lat, lng, address, className }: SafetyButtonProps) => {
  const [triggering, setTriggering] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [countdown, setCountdown] = React.useState(3);
  const countdownRef = React.useRef<ReturnType<typeof setInterval>>();

  const trigger = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    setTriggering(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      await triggerSOS({
        booking_id: bookingId ?? null,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: address ?? `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`,
      });

      toast.success("Emergency alert sent to your contacts");
      setShowConfirm(false);
    } catch (error) {
      toast.error("Failed to trigger SOS");
    } finally {
      setTriggering(false);
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    setShowConfirm(true);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          trigger();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current!);
    setShowConfirm(false);
    setCountdown(3);
  };

  React.useEffect(() => {
    return () => clearInterval(countdownRef.current!);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="destructive"
        size="lg"
        className="h-14 w-14 rounded-full flex items-center justify-center shadow-lg"
        onClick={showConfirm ? cancelCountdown : startCountdown}
        disabled={triggering}
        aria-label={showConfirm ? "Cancel SOS" : "Trigger emergency SOS"}
      >
        {showConfirm ? (
          <>
            <span className="text-2xl font-black">{countdown}</span>
            <span className="absolute bottom-1 right-1 text-[8px] font-black">RELEASE TO CANCEL</span>
          </>
        ) : (
          <AlertTriangle size={28} className="text-white" />
        )}
      </Button>

      {showConfirm && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-black text-white rounded-lg text-center text-sm font-medium shadow-lg whitespace-nowrap z-50">
          Hold for {countdown}s to trigger SOS
        </div>
      )}

      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs text-center opacity-70 whitespace-nowrap">
        Alerts emergency contacts with your location
      </div>
    </div>
  );
};

export const TripShare = ({ bookingId, trackingUrl }: { bookingId: string; trackingUrl: string }) => {
  const [sharing, setSharing] = React.useState(false);

  const handleShare = async (method: "native" | "clipboard" | "sms" | "whatsapp") => {
    const text = `Track my HopIn ride in real-time: ${trackingUrl}`;
    
    try {
      setSharing(true);
      
      if (method === "native" && navigator.share) {
        await navigator.share({ title: "Track my ride", text, url: trackingUrl });
      } else if (method === "clipboard") {
        await navigator.clipboard.writeText(trackingUrl);
        toast.success("Link copied to clipboard");
      } else if (method === "sms") {
        window.location.href = `sms:?body=${encodeURIComponent(text)}`;
      } else if (method === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Failed to share");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => handleShare("native")} disabled={sharing}>
        <Share2 size={16} className="mr-1" /> Share Trip
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleShare("clipboard")} disabled={sharing}>
        <span className="text-xs">Copy Link</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleShare("sms")} disabled={sharing}>
        <Phone size={16} className="mr-1" /> SMS
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleShare("whatsapp")} disabled={sharing}>
        <span className="text-xs">WhatsApp</span>
      </Button>
    </div>
  );
};

export const EmergencyContacts = () => {
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EmergencyContactInput>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: { is_primary: false },
  });

  React.useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await getEmergencyContacts();
      setContacts(data);
    } catch (error) {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: EmergencyContactInput) => {
    setAdding(true);
    try {
      if (editingId) {
        await updateEmergencyContact(editingId, values);
        toast.success("Contact updated");
      } else {
        await addEmergencyContact(values);
        toast.success("Contact added");
      }
      reset();
      setShowForm(false);
      setEditingId(null);
      loadContacts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save contact");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (contact: any) => {
    setEditingId(contact.id);
    setValue("name", contact.name);
    setValue("phone", contact.phone);
    setValue("relationship", contact.relationship ?? "");
    setValue("is_primary", contact.is_primary);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this emergency contact?")) return;
    try {
      await deleteEmergencyContact(id);
      toast.success("Contact deleted");
      loadContacts();
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  const handleCancel = () => {
    reset();
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">Emergency Contacts</h3>
        <Button size="sm" onClick={() => { setEditingId(null); reset(); setShowForm(true); }}>
          <UserPlus size={16} className="mr-1" /> Add Contact
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="border-2 border-black bg-gray-100 p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-black/60">Name</label>
            <input {...register("name")} className="field-shell" placeholder="John Doe" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-black/60">Phone</label>
            <input {...register("phone")} type="tel" className="field-shell" placeholder="+1 (555) 123-4567" />
            {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-black/60">Relationship (optional)</label>
            <input {...register("relationship")} className="field-shell" placeholder="Spouse, Parent, Friend" />
          </div>
          <div className="flex items-center gap-2">
            <input {...register("is_primary")} type="checkbox" id="is-primary" className="h-4 w-4 border-2 border-black" />
            <label htmlFor="is-primary" className="text-sm text-black">Primary contact (receives SOS alerts first)</label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={adding} className="flex-1">
              {adding ? <Loader2 size={16} className="animate-spin mx-auto" /> : editingId ? "Update Contact" : "Add Contact"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">Cancel</Button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="border-2 border-black bg-gray-100 p-6 text-center text-black/60">
          <Shield size={32} className="mx-auto mb-3 text-black/30" />
          <p className="font-medium">No emergency contacts yet</p>
          <p className="text-sm mt-1">Add contacts who will be notified if you trigger SOS</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="border-2 border-black bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={contact.name} src={contact.avatar_url} alt={contact.name} className="h-10 w-10" />
                <div>
                  <p className="font-black text-black">{contact.name}</p>
                  <p className="text-sm text-black/60">{contact.phone}</p>
                  {contact.relationship && <p className="text-xs text-black/50">{contact.relationship}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contact.is_primary && <Bell size={16} className="text-yellow-500" />}
                <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(contact.id)}>
                  <X size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-2 border-black bg-yellow-50 p-4 text-sm text-black/80">
        <p className="font-black mb-1">How it works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Primary contacts receive SMS + push when you trigger SOS</li>
          <li>Location and booking details are shared automatically</li>
          <li>Up to 3 primary contacts are notified simultaneously</li>
        </ul>
      </div>
    </div>
  );
};

export const SOSHistory = () => {
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    
    getSOSAlerts().then((data) => {
      if (active) {
        setAlerts(data);
        setLoading(false);
      }
    });

    const unsubscribe = subscribeToSOSAlerts(
      (await supabase.auth.getUser()).data.user?.id ?? "",
      (alert) => {
        setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (loading) return <div className="h-32 flex items-center justify-center"><Loader2 size={24} className="animate-spin" /></div>;

  if (alerts.length === 0) {
    return (
      <div className="border-2 border-black bg-gray-100 p-6 text-center text-black/60">
        <Shield size={32} className="mx-auto mb-3 text-black/30" />
        <p className="font-medium">No SOS alerts</p>
        <p className="text-sm mt-1">Your safety history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-black">SOS History</h3>
      {alerts.map((alert) => (
        <div key={alert.id} className="border-2 border-black bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <div>
                <p className="font-black text-black">Emergency Alert</p>
                <p className="text-sm text-black/60">
                  {alert.address ?? `Lat: ${alert.lat.toFixed(4)}, Lng: ${alert.lng.toFixed(4)}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={cn("px-2 py-1 text-xs font-black rounded", alert.status === "active" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                {alert.status}
              </span>
              <p className="mt-1 text-xs text-black/50">{new Date(alert.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

import { supabase } from "../../lib/supabase";
import { Shield } from "lucide-react";