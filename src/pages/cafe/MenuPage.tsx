import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Coffee,
  Minus,
  Moon,
  Plus,
  Search,
  ShoppingBag,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "@/contexts/ThemeContext";
import { formatRupiah } from "@/lib/cafe";
import { api } from "../../../convex/_generated/api";

type MenuProduct = FunctionReturnType<
  typeof api.cafe.listActiveProducts
>[number];

export function MenuPage() {
  const products = useQuery(api.cafe.listActiveProducts);
  const categories = useQuery(api.cafe.listCategories);
  const seedIfEmpty = useMutation(api.cafe.seedIfEmpty);
  const settings = useQuery(api.cafe.getSettings);
  const cafeName = settings?.cafeName ?? "Sibabu Cafe";

  useEffect(() => {
    document.title = cafeName;
  }, [cafeName]);
  const { addItem, totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("semua");
  const [cartOpen, setCartOpen] = useState(false);
  const seededRef = useRef(false);

  // Isi menu contoh otomatis saat database masih kosong.
  useEffect(() => {
    if (products !== undefined && products.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void seedIfEmpty({});
    }
  }, [products, seedIfEmpty]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      const matchCategory =
        activeCategory === "semua" || p.categoryId === activeCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, search, activeCategory]);

  const loading = products === undefined || categories === undefined;

  const handleAdd = (p: MenuProduct) => {
    addItem({
      productId: p._id,
      name: p.name,
      price: p.price,
      image: p.image,
    });
    toast.success(`${p.name} masuk keranjang`);
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="container max-w-5xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Coffee size={18} />
            </span>
            <div className="leading-tight">
              <p className="font-display text-base font-bold">{cafeName}</p>
              <p className="max-w-44 truncate text-[11px] uppercase tracking-widest text-muted-foreground">
                {settings?.slogan ?? "Menu & Order"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ganti tema"
              className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Buka keranjang"
              className="relative flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90"
            >
              <ShoppingBag size={17} />
              {totalItems > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {totalItems > 99 ? "99" : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl pb-28">
        {/* Hero */}
        <section className="py-7">
          <h1 className="max-w-xl font-display text-3xl font-bold leading-tight md:text-4xl">
            {settings?.heroTitle ?? "Mau ngopi apa hari ini? ☕"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            {settings?.heroSubtitle ??
              "Pilih menu favoritmu, pesan langsung dari meja — tanpa antre."}
          </p>
          <div className="relative mt-5 max-w-md">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kopi, makanan, dessert..."
              className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </section>

        {/* Kategori */}
        <div className="no-scrollbar sticky top-16 z-30 -mx-4 flex gap-2 overflow-x-auto bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <CategoryChip
            label="Semua"
            active={activeCategory === "semua"}
            onClick={() => setActiveCategory("semua")}
          />
          {(categories ?? []).map(c => (
            <CategoryChip
              key={c._id}
              label={c.name}
              active={activeCategory === c._id}
              onClick={() => setActiveCategory(c._id)}
            />
          ))}
        </div>

        {/* Grid produk */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-60 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Coffee size={40} className="text-muted-foreground" />
            <p className="font-semibold">Menu tidak ditemukan</p>
            <p className="text-sm text-muted-foreground">
              Coba kata kunci atau kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map(p => (
              <article
                key={p._id}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="size-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Coffee size={32} />
                    </div>
                  )}
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                    {p.categoryName}
                  </span>
                </div>
                <div className="p-3.5">
                  <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                  <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-primary">
                      {formatRupiah(p.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdd(p)}
                      className="flex h-9 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
                    >
                      <Plus size={14} /> Order
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="pt-12 pb-4 text-center text-xs text-muted-foreground">
          {cafeName} · Pesan dari meja, kami antar ke meja ·{" "}
          <Link to="/login" className="underline-offset-2 hover:underline">
            Admin
          </Link>
        </footer>
      </main>

      {/* Tombol keranjang melayang */}
      {totalItems > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex h-12 max-w-md items-center justify-between rounded-2xl bg-primary px-5 text-primary-foreground shadow-lg transition active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag size={17} /> {totalItems} item di keranjang
          </span>
          <span className="text-sm font-bold">Lihat →</span>
        </button>
      )}

      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, setQuantity, removeItem, totalPrice, totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Tutup keranjang"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45"
      />
      <div
        className="relative flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
        role="dialog"
        aria-label="Keranjang"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">
            Keranjang{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({totalItems} item)
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup keranjang"
            className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShoppingBag size={40} className="text-muted-foreground" />
            <p className="font-semibold">Keranjang masih kosong</p>
            <p className="text-sm text-muted-foreground">
              Yuk pilih menu favoritmu dulu.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto p-5">
              {items.map(item => (
                <li
                  key={item.productId}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Coffee size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="text-xs font-bold text-primary">
                      {formatRupiah(item.price)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <QtyButton
                        label="Kurangi"
                        onClick={() =>
                          setQuantity(item.productId, item.quantity - 1)
                        }
                      >
                        <Minus size={13} />
                      </QtyButton>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <QtyButton
                        label="Tambah"
                        onClick={() =>
                          setQuantity(item.productId, item.quantity + 1)
                        }
                      >
                        <Plus size={13} />
                      </QtyButton>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Hapus ${item.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-xl font-bold text-primary">
                  {formatRupiah(totalPrice)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/checkout");
                }}
                className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Lanjut ke Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QtyButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-foreground"
    >
      {children}
    </button>
  );
}
