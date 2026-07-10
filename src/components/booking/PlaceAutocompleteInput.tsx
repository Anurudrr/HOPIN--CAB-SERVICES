import * as React from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";

import { bookingLocations } from "../../content/siteContent";
import { searchPlaces, type PlaceSuggestion } from "../../lib/mapbox";
import { cn } from "../../lib/utils";
import type { SupportedCity } from "../../lib/cities";
import type { Location } from "../../store/useBookingStore";
import { Button } from "../ui/Button";

interface PlaceAutocompleteInputProps {
  label: string;
  city: SupportedCity;
  value?: Location;
  placeholder: string;
  disabled?: boolean;
  onSelect: (location: Location) => void;
  onUseCurrentLocation?: () => void;
}

function toLocation(suggestion: PlaceSuggestion, city: SupportedCity): Location {
  return {
    address: suggestion.address,
    lat: suggestion.lat,
    lng: suggestion.lng,
    city,
  };
}

export function PlaceAutocompleteInput({
  label,
  city,
  value,
  placeholder,
  disabled = false,
  onSelect,
  onUseCurrentLocation,
}: PlaceAutocompleteInputProps) {
  const [query, setQuery] = React.useState(value?.address ?? "");
  const [suggestions, setSuggestions] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setQuery(value?.address ?? "");
  }, [value?.address]);

  React.useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const localSuggestions = bookingLocations
      .filter((location) => location.city === city)
      .filter((location) => location.address.toLowerCase().includes(query.trim().toLowerCase()))
      .slice(0, 5)
      .map((location) => ({
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        city,
      }));

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const remoteSuggestions = await searchPlaces(query, value ? { lat: value.lat, lng: value.lng } : undefined);

        if (!active) {
          return;
        }

        const normalizedRemote = remoteSuggestions.map((suggestion) => toLocation(suggestion, city));
        setSuggestions(normalizedRemote.length ? normalizedRemote : localSuggestions);
      } catch {
        if (active) {
          setSuggestions(localSuggestions);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [city, open, query, value]);

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
          {label}
        </label>
        {onUseCurrentLocation ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 !px-0 !py-0 text-[10px] tracking-[0.2em]"
            onClick={onUseCurrentLocation}
            disabled={disabled}
          >
            <LocateFixed size={14} />
            Use current
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/45" size={16} />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className="field-shell pl-11"
        />

        {open && (loading || suggestions.length > 0 || query.trim().length >= 2) ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 border-2 border-black bg-white shadow-premium">
            {loading ? (
              <div className="px-4 py-4 text-sm text-black/60">Searching locations...</div>
            ) : suggestions.length ? (
              suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.address}-${suggestion.lat}-${suggestion.lng}`}
                  type="button"
                  onClick={() => {
                    onSelect(suggestion);
                    setQuery(suggestion.address);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-black/10 px-4 py-4 text-left last:border-b-0",
                    "hover:bg-black hover:text-white",
                  )}
                >
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span className="text-sm font-medium leading-6">{suggestion.address}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-black/60">
                No location suggestions found for this city yet.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
