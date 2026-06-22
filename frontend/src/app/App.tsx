import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./components/lib/auth-context";
import { Toaster } from "sonner";
import { useEffect } from "react";

function DarkModeInit() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return null;
}

export default function App() {
  return (
    <>
      <DarkModeInit />
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#09090b",
              border: "1px solid #27272a",
              color: "#fafafa",
              borderRadius: "0.25rem"
            },
          }}
        />
      </AuthProvider>
    </>
  );
}
