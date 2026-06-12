import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, Coffee, Send } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { formatRupiah } from "@/lib/cafe";
import { api } from "../../../convex/_generated/api";

export function CheckoutPage() {
  const navigate = useNavigate();
  const placeOrder = useMutation(api.cafe.placeOrder);
  const settings = useQuery(api.cafe.getSettings);
  const tableCount = settings?.tableCount ?? 12;
  const { items, totalPrice, clearCart } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim().length < 2) {
      toast.error("Nama pelanggan minimal 2 karakter.");
      return;
    }
    if (!tableNumber.trim()) {
      toast.error("Pilih nomor meja dulu.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await placeOrder({
        customerName: customerName.trim(),
        tableNumber: tableNumber.trim(),
        notes: notes.trim() || undefined,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      clearCart();
      setSuccessCode(result.code);
      toast.success("Pesanan berhasil dikirim!");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message.replace(/^.*Uncaught Error:\s*/, "").split("\n")[0]
          : "Gagal mengirim pesanan.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (successCode) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 size={56} className="mx-auto text-success" />
          <h1 className="mt-4 font-display text-2xl font-bold">
            Pesanan Terkirim!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Kode pesananmu:</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-primary">
            {successCode}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Silakan tunggu di meja — pesananmu sedang disiapkan barista kami. ☕
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-6 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <Coffee size={40} className="text-muted-foreground" />
        <p className="font-semibold">Keranjang masih kosong</p>
        <p className="text-sm text-muted-foreground">
          Pilih dulu menu yang ingin dipesan.
        </p>
        <Link
          to="/"
          className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Lihat Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="container max-w-3xl flex h-16 items-center gap-3">
          <Link
            to="/"
            aria-label="Kembali"
            className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-display text-lg font-bold">Checkout</h1>
        </div>
      </header>

      <main className="container max-w-3xl grid gap-6 py-6 md:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Data Pemesan</h2>
            <div className="space-y-4">
              <Field label="Nama pelanggan *">
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi"
                  maxLength={60}
                  required
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </Field>
              <Field label="Nomor meja *">
                <select
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  required
                  aria-label="Nomor meja"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="" disabled>
                    Pilih meja...
                  </option>
                  {Array.from({ length: tableCount }, (_, i) => (
                    <option key={`t-${i + 1}`} value={String(i + 1)}>
                      Meja {i + 1}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Catatan pesanan (opsional)">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contoh: less sugar, tanpa es, saus dipisah..."
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Send size={17} />
            {submitting ? "Mengirim..." : "Kirim Pesanan"}
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 md:sticky md:top-20">
          <h2 className="mb-3 font-semibold">Ringkasan Pesanan</h2>
          <ul className="space-y-2.5 text-sm">
            {items.map(item => (
              <li key={item.productId} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {item.quantity}× {item.name}
                </span>
                <span className="shrink-0 font-medium">
                  {formatRupiah(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">Total</span>
            <span className="font-display text-lg font-bold text-primary">
              {formatRupiah(totalPrice)}
            </span>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: input passed as children */}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
          {label}
        </span>
        {children}
      </label>
    </>
  );
}
