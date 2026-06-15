"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getRedirectPathByUser, getStoredUser } from "@/utils/roleRedirect";
import { initSocket } from "@/utils/socket";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    initSocket(token);
    router.replace(getRedirectPathByUser(user));
  }, [router]);

  return (
    <main className="grid min-h-[100svh] place-items-center overflow-x-hidden bg-[#fbfbfd] px-3 py-4 text-[#071033] sm:px-4 lg:px-8">
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-[360px] flex-col items-center gap-3 rounded-[14px] border border-[#e7e9f1] bg-white px-6 py-6 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:max-w-[400px] sm:gap-4 sm:rounded-2xl sm:px-8 sm:py-7"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff1eb]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff4b0b]" />
        </span>

        <div className="min-w-0 space-y-1">
          <p className="break-words font-[var(--font-primary)] text-sm font-bold leading-5 text-[#071033] sm:text-[15px]">
            Redirecting...
          </p>

          <p className="break-words font-[var(--font-primary)] text-xs font-medium leading-5 text-[#626a82] sm:text-[13px]">
            Taking you to the admin panel
          </p>
        </div>
      </div>
    </main>
  );
}
