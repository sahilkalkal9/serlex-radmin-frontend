"use client";

import { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";
import AdminTopbar from "@/components/AdminTopbar";
import {
  getRedirectPathByUser,
  getStoredUser,
  hasRequiredAccess,
  getRoleBanner,
} from "@/utils/roleRedirect";
import { TopbarProvider, useTopbarConfig } from "@/contexts/TopbarContext";

const PageContent = memo(function PageContent({ children }) {
  return children;
});

function TopbarRenderer({ sidebarCollapsed }) {
  const config = useTopbarConfig();
  return <AdminTopbar {...config} sidebarCollapsed={sidebarCollapsed} />;
}

function RoleBanner() {
  const user = getStoredUser();
  const banner = getRoleBanner(user);

  if (!banner) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] flex h-10 items-center justify-center text-sm font-bold tracking-wider"
      style={{ backgroundColor: banner.bg, color: banner.text }}
    >
      {banner.label}
    </div>
  );
}

const BANNER_HEIGHT = 40;

export default function AdminLayout({ children }) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const initializeAdmin = async () => {
      const user = getStoredUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!hasRequiredAccess(user)) {
        router.replace(getRedirectPathByUser(user));
        return;
      }

      setReady(true);
    };

    initializeAdmin();
  }, [router]);

  if (!ready) {
    return (
      <main className="grid min-h-[100svh] place-items-center bg-[#fbfbfd] px-4">
        <div className="flex items-center gap-3 rounded-[14px] border border-[#e7e9f1] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <Loader2 className="h-5 w-5 animate-spin text-[#ff4b0b]" />
          <span className="font-[var(--font-primary)] text-[13px] font-bold text-[#071033]">
            Loading admin panel...
          </span>
        </div>
      </main>
    );
  }

  return (
    <TopbarProvider>
      <div className="min-h-screen bg-[#faf9fc]">
        <RoleBanner />
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          topOffset={BANNER_HEIGHT}
        />

        <main
          className={`min-h-screen pt-10 transition-all duration-300 ${
            sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[220px]"
          } max-lg:pl-0`}
        >
          <TopbarRenderer sidebarCollapsed={sidebarCollapsed} />
          <PageContent>{children}</PageContent>
        </main>
      </div>
    </TopbarProvider>
  );
}
