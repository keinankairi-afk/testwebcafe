import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  ClipboardList,
  Coffee,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldX,
  Store,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "../../../convex/_generated/api";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Produk", icon: UtensilsCrossed },
  { to: "/admin/orders", label: "Pesanan", icon: ClipboardList },
];

/**
 * Layout panel admin. Pengguna login pertama otomatis jadi admin (pemilik
 * cafe); akun lain diblokir di sini.
 */
export function AdminLayout() {
  const { signOut } = useAuthActions();
  const ensureAdmin = useMutation(api.admin.ensureAdmin);
  const settings = useQuery(api.cafe.getSettings);
  const cafeName = settings?.cafeName ?? "Sibabu Cafe";
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [adminState, setAdminState] = useState<"checking" | "ok" | "denied">(
    "checking",
  );

  useEffect(() => {
    let active = true;
    ensureAdmin({})
      .then(result => {
        if (active) setAdminState(result.isAdmin ? "ok" : "denied");
      })
      .catch(() => {
        if (active) setAdminState("denied");
      });
    return () => {
      active = false;
    };
  }, [ensureAdmin]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Berhasil keluar.");
    navigate("/");
  };

  if (adminState === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 bg-background text-muted-foreground">
        <Coffee size={20} className="animate-pulse" /> Memeriksa akses admin...
      </div>
    );
  }

  if (adminState === "denied") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <ShieldX size={44} className="text-destructive" />
        <h1 className="font-display text-xl font-bold">Akses Ditolak</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Akun ini tidak punya akses admin. Hubungi pemilik cafe untuk
          mendapatkan akses.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            to="/"
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-secondary"
          >
            Ke Menu
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Coffee size={18} />
          </span>
          <div className="leading-tight">
            <p className="font-display font-bold">{cafeName}</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Admin POS
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active =
              to === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={17} /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Ganti tema"
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            to="/"
            aria-label="Lihat menu customer"
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
          >
            <Store size={16} />
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Keluar"
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-destructive/40 text-destructive transition hover:bg-destructive/10"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coffee size={15} />
          </span>
          <p className="font-display text-sm font-bold">{cafeName}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Ganti tema"
            className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Keluar"
            className="flex size-9 items-center justify-center rounded-xl border border-destructive/40 text-destructive"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-7 md:pb-8">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={19} /> {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
