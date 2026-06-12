import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Coffee,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/cafe";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const MAX_IMAGE_MB = 4;

type AdminProduct = FunctionReturnType<
  typeof api.admin.listAllProducts
>[number];
type AdminCategory = FunctionReturnType<typeof api.cafe.listCategories>[number];

/** Manajemen produk: daftar + CRUD + foto + aktif/nonaktif. */
export function AdminProductsPage() {
  const products = useQuery(api.admin.listAllProducts);
  const categories = useQuery(api.cafe.listCategories);
  const updateProduct = useMutation(api.admin.updateProduct);
  const deleteProduct = useMutation(api.admin.deleteProduct);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);

  const loading = products === undefined || categories === undefined;

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q),
    );
  }, [products, query]);

  const toggleActive = async (p: AdminProduct) => {
    try {
      await updateProduct({ productId: p._id, isActive: !p.isActive });
      toast.success(
        p.isActive ? `${p.name} dinonaktifkan` : `${p.name} diaktifkan`,
      );
    } catch {
      toast.error("Gagal mengubah status produk.");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProduct({ productId: deleting._id });
      toast.success(`${deleting.name} dihapus.`);
      setDeleting(null);
    } catch {
      toast.error("Gagal menghapus produk.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Produk</h1>
          <p className="text-sm text-muted-foreground">
            {products?.length ?? 0} produk · {categories?.length ?? 0} kategori
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={17} /> Tambah Produk
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari produk..."
          className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Coffee size={36} className="text-muted-foreground" />
          <p className="font-semibold">
            {query ? "Produk tidak ditemukan" : "Belum ada produk"}
          </p>
          <p className="text-sm text-muted-foreground">
            {query
              ? "Coba kata kunci lain."
              : "Tekan Tambah Produk untuk membuat menu pertama."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(p => (
            <li
              key={p._id}
              className={`flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3 ${
                p.isActive ? "" : "opacity-60"
              }`}
            >
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Coffee size={22} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {p.name}
                  {!p.isActive && (
                    <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      NONAKTIF
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.categoryName} · {formatRupiah(p.price)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void toggleActive(p)}
                  aria-label={p.isActive ? "Nonaktifkan" : "Aktifkan"}
                  title={p.isActive ? "Nonaktifkan" : "Aktifkan"}
                  className={`flex size-9 items-center justify-center rounded-xl border transition ${
                    p.isActive
                      ? "border-success/40 text-success hover:bg-success/10"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.isActive ? (
                    <ToggleRight size={18} />
                  ) : (
                    <ToggleLeft size={18} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                  aria-label="Edit"
                  className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(p)}
                  aria-label="Hapus"
                  className="flex size-9 items-center justify-center rounded-xl border border-destructive/40 text-destructive transition hover:bg-destructive/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && categories && (
        <ProductFormModal
          product={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}

      {deleting && (
        <Modal title="Hapus Produk" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus{" "}
            <b className="text-foreground">{deleting.name}</b>? Tindakan ini
            tidak bisa dibatalkan.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="h-11 flex-1 rounded-xl border border-border font-medium transition hover:bg-secondary"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="h-11 flex-1 rounded-xl bg-destructive font-semibold text-white transition hover:opacity-90"
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45"
      />
      <div
        role="dialog"
        aria-label={title}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [categoryId, setCategoryId] = useState<string>(
    product?.categoryId ?? categories[0]?._id ?? "",
  );
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(product?.image ?? "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Ukuran gambar maksimal ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Upload foto gagal.");
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    return storageId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNumber = Number(price);
    if (name.trim().length < 2) {
      toast.error("Nama produk minimal 2 karakter.");
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber < 1) {
      toast.error("Harga tidak valid.");
      return;
    }
    if (!categoryId) {
      toast.error("Pilih kategori dulu.");
      return;
    }
    if (!product && !imageFile) {
      toast.error("Foto produk wajib diunggah.");
      return;
    }

    setSaving(true);
    try {
      const imageStorageId = imageFile
        ? await uploadImage(imageFile)
        : undefined;
      if (product) {
        await updateProduct({
          productId: product._id,
          name: name.trim(),
          description: description.trim(),
          price: priceNumber,
          categoryId: categoryId as Id<"categories">,
          isActive,
          ...(imageStorageId ? { imageStorageId } : {}),
        });
        toast.success("Produk diperbarui.");
      } else {
        await createProduct({
          name: name.trim(),
          description: description.trim(),
          price: priceNumber,
          categoryId: categoryId as Id<"categories">,
          isActive,
          imageStorageId,
        });
        toast.success("Produk ditambahkan.");
      }
      onSaved();
    } catch {
      toast.error("Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? "Edit Produk" : "Tambah Produk"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative block aspect-video w-full overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card transition hover:border-ring"
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview foto produk"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImagePlus size={28} />
              <span className="text-sm font-medium">
                Pilih foto produk (maks. {MAX_IMAGE_MB} MB)
              </span>
            </span>
          )}
          {preview && (
            <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
              Ganti foto
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={e => pickImage(e.target.files?.[0] ?? null)}
        />

        <Field label="Nama produk *">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
            required
            placeholder="Contoh: Caffe Latte"
            className="h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </Field>

        <Field label="Deskripsi">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Deskripsi singkat menu..."
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Harga (Rp) *">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              placeholder="25000"
              className="h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </Field>
          <Field label="Kategori *">
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              {categories.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium">
            Produk aktif (tampil di menu customer)
          </span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {saving
            ? "Menyimpan..."
            : product
              ? "Simpan Perubahan"
              : "Tambah Produk"}
        </button>
      </form>
    </Modal>
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
