import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

/** Terapkan warna tema cafe (dari pengaturan admin) ke seluruh halaman. */
export function CafeThemeApplier() {
  const settings = useQuery(api.cafe.getSettings);
  const themeColor = settings?.themeColor ?? "kopi";

  useEffect(() => {
    if (themeColor === "kopi") {
      delete document.documentElement.dataset.cafeTheme;
    } else {
      document.documentElement.dataset.cafeTheme = themeColor;
    }
  }, [themeColor]);

  return null;
}
