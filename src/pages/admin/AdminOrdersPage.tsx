import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  CheckCircle2,
  ChefHat,
  ClipboardList,
  StickyNote,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  formatDateTime,
  formatRupiah,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/cafe";
import { api } from "../../../convex/_generated/api";

type AdminOrder = FunctionReturnType<typeof api.admin.listOrders>[number];
type Filter = "semua" | OrderStatus;

/** Manajemen pesanan: realtime (Convex), detail item, ubah status. */
export function AdminOrdersPage() {
  const orders = useQuery(api.admin.listOrders);
  const updateOrderStatus = useMutation(api.admin.updateOrderStatus);

  const [filter, setFilter] = useState<Filter>("semua");
  const [expanded, setExpanded] = useState<string | null>(null);

  const loading = orders === undefined;

  // Toast saat ada pesanan baru masuk.
  const prevCount = useRef<number | null>(null);
  useEffect(() => {
    if (orders === undefined) return;
    if (prevCount.current !== null && orders.length > prevCount.current) {
      toast.info("🔔 Pesanan baru masuk!");
    }
    prevCount.current = orders.length;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return filter === "semua"
      ? orders
      : orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { semua: orders?.length ?? 0 };
    for (const s of ORDER_STATUSES) {
      c[s] = orders?.filter(o => o.status === s).length ?? 0;
    }
    return c;
  }, [orders]);

  const setStatus = async (order: AdminOrder, status: OrderStatus) => {
    try {
      await updateOrderStatus({ orderId: order._id, status });
      toast.success(`Pesanan ${order.code} → ${ORDER_STATUS_LABEL[status]}`);
    } catch {
      toast.error("Gagal mengubah status pesanan.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Pesanan</h1>
        <p className="text-sm text-muted-foreground">
          Pesanan masuk muncul otomatis secara realtime
        </p>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {(["semua", ...ORDER_STATUSES] as Filter[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "semua" ? "Semua" : ORDER_STATUS_LABEL[f]}
            <span className="ml-1.5 text-xs opacity-75">
              ({counts[f] ?? 0})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <ClipboardList size={36} className="text-muted-foreground" />
          <p className="font-semibold">Belum ada pesanan</p>
          <p className="text-sm text-muted-foreground">
            {filter === "semua"
              ? "Pesanan dari customer akan muncul di sini secara otomatis."
              : `Tidak ada pesanan berstatus ${ORDER_STATUS_LABEL[filter as OrderStatus]}.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(o => {
            const isOpen = expanded === o._id;
            const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <li
                key={o._id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : o._id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-secondary/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {o.customerName}
                      <span className="ml-2 font-normal text-muted-foreground">
                        Meja {o.tableNumber}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.code} · {formatDateTime(o._creationTime)} · {itemCount}{" "}
                      item
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-bold text-primary">
                      {formatRupiah(o.total)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ORDER_STATUS_CLASS[o.status]}`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/40 px-4 py-4">
                    <ul className="space-y-1.5 text-sm">
                      {o.items.map(item => (
                        <li
                          key={item._id}
                          className="flex justify-between gap-3"
                        >
                          <span className="text-muted-foreground">
                            {item.quantity}× {item.productName}
                          </span>
                          <span className="shrink-0 font-medium">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {o.notes && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
                        <StickyNote size={14} className="mt-0.5 shrink-0" />
                        {o.notes}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {o.status === "pending" && (
                        <>
                          <ActionButton
                            icon={<ChefHat size={15} />}
                            label="Proses Pesanan"
                            tone="info"
                            onClick={() => void setStatus(o, "diproses")}
                          />
                          <ActionButton
                            icon={<XCircle size={15} />}
                            label="Batalkan"
                            tone="danger"
                            onClick={() => void setStatus(o, "dibatalkan")}
                          />
                        </>
                      )}
                      {o.status === "diproses" && (
                        <>
                          <ActionButton
                            icon={<CheckCircle2 size={15} />}
                            label="Tandai Selesai"
                            tone="success"
                            onClick={() => void setStatus(o, "selesai")}
                          />
                          <ActionButton
                            icon={<XCircle size={15} />}
                            label="Batalkan"
                            tone="danger"
                            onClick={() => void setStatus(o, "dibatalkan")}
                          />
                        </>
                      )}
                      {(o.status === "selesai" ||
                        o.status === "dibatalkan") && (
                        <ActionButton
                          icon={<ChefHat size={15} />}
                          label="Kembalikan ke Diproses"
                          tone="muted"
                          onClick={() => void setStatus(o, "diproses")}
                        />
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "info" | "success" | "danger" | "muted";
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    info: "border-info/40 text-info hover:bg-info/10",
    success: "border-success/40 text-success hover:bg-success/10",
    danger: "border-destructive/40 text-destructive hover:bg-destructive/10",
    muted:
      "border-border text-muted-foreground hover:text-foreground hover:bg-secondary",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${tones[tone]}`}
    >
      {icon} {label}
    </button>
  );
}
