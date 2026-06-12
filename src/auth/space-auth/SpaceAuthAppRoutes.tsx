import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CafeThemeApplier } from "@/components/CafeThemeApplier";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/PublicOnlyRoute";
import { CartProvider } from "@/contexts/CartContext";
import { LoginPage, SignupPage } from "@/pages";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { CheckoutPage } from "@/pages/cafe/CheckoutPage";
import { MenuPage } from "@/pages/cafe/MenuPage";
import { convex } from "../convexClient";

export function SpaceAuthAppRoutes() {
  return (
    <ConvexAuthProvider client={convex}>
      <CartProvider>
        <CafeThemeApplier />
        <Routes>
          {/* Customer (publik, tanpa login) */}
          <Route path="/" element={<MenuPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* Auth admin */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Panel admin (wajib login + akses admin) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </ConvexAuthProvider>
  );
}
