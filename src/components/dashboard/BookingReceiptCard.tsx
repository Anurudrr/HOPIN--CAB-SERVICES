import * as React from "react";
import QRCode from "qrcode";

import { formatCurrency, formatDateTime } from "../../lib/format";
import type { BookingReceipt } from "../../types";

export function BookingReceiptCard({ receipt }: { receipt: BookingReceipt }) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const payload = JSON.stringify({
      bookingId: receipt.booking.id,
      bookingCode: receipt.booking.booking_code,
      invoiceNumber: receipt.booking.invoice_number,
      pickup: receipt.booking.pickup_address,
      destination: receipt.booking.dest_address,
      total: receipt.booking.fare_total,
    });

    void QRCode.toDataURL(payload, {
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
      width: 180,
    }).then((url: string) => {
      if (active) {
        setQrDataUrl(url);
      }
    }).catch(() => {
      if (active) {
        setQrDataUrl(null);
      }
    });

    return () => {
      active = false;
    };
  }, [receipt]);

  return (
    <div className="panel p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Invoice and QR
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
            {receipt.booking.invoice_number || "Pending invoice"}
          </h3>
          <p className="mt-3 text-sm leading-7 text-black/60">
            {receipt.service?.name || "Service booking"} from {receipt.booking.pickup_address} to{" "}
            {receipt.booking.dest_address}
          </p>
        </div>
        <div className="border-2 border-black bg-white p-3 shadow-soft">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Booking confirmation QR code" className="h-36 w-36" />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center bg-gray-100 text-xs font-bold uppercase tracking-[0.18em] text-black/45">
              QR loading
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-none border-2 border-black bg-gray-100 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
            Booking code
          </p>
          <p className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-black">
            {receipt.booking.booking_code || "Pending"}
          </p>
        </div>
        <div className="rounded-none border-2 border-black bg-gray-100 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
            Created
          </p>
          <p className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-black">
            {formatDateTime(receipt.booking.created_at)}
          </p>
        </div>
        <div className="rounded-none border-2 border-black bg-gray-100 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
            Provider
          </p>
          <p className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-black">
            {receipt.provider?.profile?.full_name || receipt.booking.driver_name || "Assigned soon"}
          </p>
        </div>
        <div className="rounded-none border-2 border-black bg-gray-100 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
            Total paid
          </p>
          <p className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-black">
            {formatCurrency(receipt.transaction?.amount || receipt.booking.fare_total)}
          </p>
        </div>
      </div>

      <div className="mt-6 border-2 border-black">
        {[
          ["Subtotal", receipt.booking.subtotal_amount ?? receipt.booking.fare_total],
          ["Platform fee", receipt.booking.platform_fee ?? receipt.transaction?.platform_fee ?? 0],
          ["Tax", receipt.booking.tax_amount ?? receipt.transaction?.tax_amount ?? 0],
          ["Grand total", receipt.transaction?.amount ?? receipt.booking.fare_total],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-black/10 px-4 py-3 last:border-b-0"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.08em] text-black/60">
              {label}
            </span>
            <span className="text-sm font-black uppercase tracking-[0.08em] text-black">
              {formatCurrency(Number(value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
