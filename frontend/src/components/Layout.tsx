import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Toaster } from "sonner";

export function Layout({ children }: { children: React.ReactNode }) {
  // WebSocket через nginx reverse proxy (/ws → api-gateway:8000/ws)
  useWebSocket();

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <Sidebar />
      <main className="ml-16 lg:ml-60 mt-14 min-h-[calc(100vh-56px)] p-4 lg:p-6 transition-all">
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1a2e",
            border: "1px solid #2a2a40",
            color: "#f1f5f9",
          },
        }}
      />
    </div>
  );
}
