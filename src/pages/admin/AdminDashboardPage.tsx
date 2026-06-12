import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  Banknote,
  Check,
  ClipboardList,
  CupSoda,
  KeyRound,
  Store,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatRupiah,
  formatTime,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/cafe";
import { api } from "../../../convex/_generated/api";

/** Dashboard: analitik hari ini + pesanan terbaru (realtime via Convex). */
export function AdminDashboardPage() {
  const orders = useQuery(api.admin.listOrders);
  const settings = useQuery(api.cafe.getSettings);
  const loading = orders === undefined;

  const stats = useMemo(() => {
    if (!orders) return { totalToday: 0, revenue: 0, itemsSold: 0, pending: 0 };
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const todayOrders = orders.filter(o => o._creationTime >= startOfDay);
    const validOrders = todayOrders.filter(o => o.status !== "dibatalkan");
    return {
      totalToday: todayOrders.length,
      revenue: validOrders.reduce((s, o) => s + o.total, 0),
      itemsSold: validOrders.reduce(
        (s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0),
        0,
      ),
      pending: orders.filter(o => o.status === "pending").length,
    };
  }, [orders]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan operasional {settings?.cafeName ?? "cafe"} hari ini
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Pesanan Hari Ini"
          value={loading ? "—" : String(stats.totalToday)}
        />
        <StatCard
          icon={<Banknote size={20} />}
          label="Pendapatan Hari Ini"
          value={loading ? "—" : formatRupiah(stats.revenue)}
        />
        <StatCard
          icon={<CupSoda size={20} />}
          label="Produk Terjual"
          value={loading ? "—" : String(stats.itemsSold)}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Menunggu (Pending)"
          value={loading ? "—" : String(stats.pending)}
          highlight={stats.pending > 0}
        />
      </div>

      <CafeSettingsCard />

      <ChangeUsernameCard />

      <ChangePasswordCard />

      <section className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Pesanan Terbaru</h2>
          <p className="text-xs text-muted-foreground">
            Diperbarui otomatis saat ada pesanan masuk (realtime)
          </p>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Belum ada pesanan masuk.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 8).map(o => (
              <li
                key={o._id}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {o.customerName}{" "}
                    <span className="font-normal text-muted-foreground">
                      · Meja {o.tableNumber}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.code} · {formatTime(o._creationTime)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-primary">
                    {formatRupiah(o.total)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ORDER_STATUS_CLASS[o.status]}`}
                  >
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-warning/40 bg-warning/10" : "border-border bg-card"
      }`}
    >
      <div
        className={`mb-3 flex size-10 items-center justify-center rounded-xl ${
          highlight
            ? "bg-warning/20 text-warning"
            : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
      </div>
      <p className="font-display text-xl font-bold leading-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const THEME_OPTIONS: { id: string; label: string; swatch: string }[] = [
  { id: "kopi", label: "Kopi", swatch: "oklch(0.42 0.07 55)" },
  { id: "hijau", label: "Hijau", swatch: "oklch(0.45 0.11 152)" },
  { id: "biru", label: "Biru", swatch: "oklch(0.46 0.12 250)" },
  { id: "ungu", label: "Ungu", swatch: "oklch(0.46 0.15 300)" },
  { id: "merah", label: "Merah", swatch: "oklch(0.48 0.16 25)" },
  { id: "jingga", label: "Jingga", swatch: "oklch(0.55 0.15 55)" },
];

/** Pengaturan cafe: nama + warna tema, tersimpan di database. */
function CafeSettingsCard() {
  const settings = useQuery(api.cafe.getSettings);
  const updateSettings = useMutation(api.admin.updateSettings);
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [color, setColor] = useState("kopi");
  const [tables, setTables] = useState(12);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (settings && !touched) {
      setName(settings.cafeName);
      setSlogan(settings.slogan);
      setHeroTitle(settings.heroTitle);
      setHeroSubtitle(settings.heroSubtitle);
      setColor(settings.themeColor);
      setTables(settings.tableCount);
    }
  }, [settings, touched]);

  const dirty =
    settings !== undefined &&
    (name.trim() !== settings.cafeName ||
      slogan.trim() !== settings.slogan ||
      heroTitle.trim() !== settings.heroTitle ||
      heroSubtitle.trim() !== settings.heroSubtitle ||
      color !== settings.themeColor ||
      tables !== settings.tableCount);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Store size={16} /> Pengaturan Cafe
        </h2>
        <p className="text-xs text-muted-foreground">
          Nama dan warna tampilan untuk pelanggan & admin
        </p>
      </div>
      <form
        className="space-y-4 p-5"
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          try {
            await updateSettings({
              cafeName: name,
              slogan,
              heroTitle,
              heroSubtitle,
              themeColor: color,
              tableCount: tables,
            });
            setTouched(false);
            toast.success("Pengaturan disimpan");
          } catch {
            toast.error(
              "Gagal menyimpan. Cek nama cafe (2-60 karakter) & jumlah meja (1-200).",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
            Nama Cafe
          </span>
          <input
            value={name}
            onChange={e => {
              setTouched(true);
              setName(e.target.value);
            }}
            minLength={2}
            maxLength={60}
            required
            className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Nama cafe"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
            Slogan (tampil di header menu pelanggan)
          </span>
          <input
            value={slogan}
            onChange={e => {
              setTouched(true);
              setSlogan(e.target.value);
            }}
            maxLength={60}
            aria-label="Slogan"
            className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Contoh: Menu & Order, Rumah Makan Keluarga"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
            Tulisan Sambutan (judul besar di halaman menu)
          </span>
          <input
            value={heroTitle}
            onChange={e => {
              setTouched(true);
              setHeroTitle(e.target.value);
            }}
            maxLength={80}
            aria-label="Tulisan Sambutan"
            className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Contoh: Mau makan apa hari ini? 🍽️"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
            Teks di Bawah Sambutan
          </span>
          <input
            value={heroSubtitle}
            onChange={e => {
              setTouched(true);
              setHeroSubtitle(e.target.value);
            }}
            maxLength={120}
            aria-label="Teks di Bawah Sambutan"
            className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Contoh: Pilih menu favoritmu, pesan langsung dari meja."
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
            Jumlah Meja
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Kurangi meja"
              onClick={() => {
                setTouched(true);
                setTables(t => Math.max(1, t - 1));
              }}
              className="flex size-11 items-center justify-center rounded-xl border border-border text-lg font-bold"
            >
              −
            </button>
            <span className="min-w-12 text-center text-base font-semibold tabular-nums">
              {tables}
            </span>
            <button
              type="button"
              aria-label="Tambah meja"
              onClick={() => {
                setTouched(true);
                setTables(t => Math.min(200, t + 1));
              }}
              className="flex size-11 items-center justify-center rounded-xl border border-border text-lg font-bold"
            >
              +
            </button>
            <span className="text-xs text-muted-foreground">
              Pelanggan pilih meja 1-{tables} saat checkout
            </span>
          </div>
        </div>
        <div>
          <span className="mb-2 block text-[13px] font-medium text-muted-foreground">
            Warna Web
          </span>
          <div className="flex flex-wrap gap-2.5">
            {THEME_OPTIONS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTouched(true);
                  setColor(t.id);
                }}
                aria-label={`Warna ${t.label}`}
                title={t.label}
                className={`flex size-10 items-center justify-center rounded-full border-2 transition ${
                  color === t.id
                    ? "border-foreground scale-110"
                    : "border-transparent opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: t.swatch }}
              >
                {color === t.id && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </form>
    </section>
  );
}

/** Ganti password admin (tersimpan ter-hash di database). */
function ChangePasswordCard() {
  const changePassword = useAction(api.adminAuth.changePassword);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound size={16} /> Ganti Password
        </h2>
        <p className="text-xs text-muted-foreground">
          Password login admin (username tetap)
        </p>
      </div>
      <form
        className="space-y-4 p-5"
        onSubmit={async e => {
          e.preventDefault();
          if (newPw !== confirmPw) {
            toast.error("Konfirmasi password tidak sama.");
            return;
          }
          if (newPw.length < 8) {
            toast.error("Password baru minimal 8 karakter.");
            return;
          }
          setSaving(true);
          try {
            await changePassword({ oldPassword: oldPw, newPassword: newPw });
            setOldPw("");
            setNewPw("");
            setConfirmPw("");
            toast.success("Password berhasil diganti");
          } catch (err) {
            toast.error(
              err instanceof ConvexError && typeof err.data === "string"
                ? err.data
                : "Gagal mengganti password.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <PasswordField
          label="Password Lama"
          value={oldPw}
          onChange={setOldPw}
          placeholder="Password sekarang"
        />
        <PasswordField
          label="Password Baru"
          value={newPw}
          onChange={setNewPw}
          placeholder="Minimal 8 karakter"
        />
        <PasswordField
          label="Konfirmasi Password Baru"
          value={confirmPw}
          onChange={setConfirmPw}
          placeholder="Ulangi password baru"
        />
        <button
          type="submit"
          disabled={saving || !oldPw || !newPw || !confirmPw}
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {saving ? "Menyimpan..." : "Ganti Password"}
        </button>
      </form>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        minLength={label.includes("Baru") ? 8 : 1}
        aria-label={label}
        className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
    </div>
  );
}

/** Ganti username login admin. */
function ChangeUsernameCard() {
  const currentUsername = useQuery(api.admin.getLoginUsername);
  const changeUsername = useAction(api.adminAuth.changeUsername);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <UserRound size={16} /> Ganti Username
        </h2>
        <p className="text-xs text-muted-foreground">
          Username sekarang:{" "}
          <span className="font-semibold text-foreground">
            {currentUsername ?? "..."}
          </span>
        </p>
      </div>
      <form
        className="space-y-4 p-5"
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          try {
            await changeUsername({ password, newUsername: username });
            setUsername("");
            setPassword("");
            toast.success("Username berhasil diganti");
          } catch (err) {
            toast.error(
              err instanceof ConvexError && typeof err.data === "string"
                ? err.data
                : "Gagal mengganti username.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
            Username Baru
          </span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            aria-label="Username Baru"
            autoCapitalize="none"
            autoCorrect="off"
            className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="3-30 karakter, tanpa spasi"
          />
        </div>
        <PasswordField
          label="Password (konfirmasi)"
          value={password}
          onChange={setPassword}
          placeholder="Password sekarang"
        />
        <button
          type="submit"
          disabled={saving || !username || !password}
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {saving ? "Menyimpan..." : "Ganti Username"}
        </button>
      </form>
    </section>
  );
}
