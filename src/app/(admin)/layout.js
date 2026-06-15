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
  ROLE_BANNER_CONFIG,
} from "@/utils/roleRedirect";
import { TopbarProvider, useTopbarConfig } from "@/contexts/TopbarContext";

const PageContent = memo(function PageContent({ children }) {
  return children;
});

function TopbarRenderer({ sidebarCollapsed }) {
  const config = useTopbarConfig();
  const user = getStoredUser();
  const deptLabel = user?.subRole ? ROLE_BANNER_CONFIG[user.subRole]?.label : "";

  const prefixedTitle = deptLabel && config.title
    ? `${deptLabel.split(" ")[0]} ${config.title}`
    : config.title;

  return (
    <AdminTopbar
      {...config}
      title={prefixedTitle}
      sidebarCollapsed={sidebarCollapsed}
    />
  );
}

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
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main
          className={`min-h-screen transition-all duration-300 ${
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
