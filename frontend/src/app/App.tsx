import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./components/lib/auth-context";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        theme="light"
        toastOptions={{
          style: {
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            color: "#111827",
            borderRadius: "0.875rem",
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.08)",
            fontSize: "14px",
            fontWeight: 500,
          },
        }}
      />
    </AuthProvider>
  );
}
