"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Home,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

import Typo from "@/components/ui/typo";
import api from "@/utils/api";
import { getAutoLocation } from "@/utils/location";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import {
  getRedirectPathByUser,
  getStoredUser,
  isAdminUser,
} from "@/utils/roleRedirect";
import { initSocket } from "@/utils/socket";

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    employeeId: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (token && user) {
      router.replace(getRedirectPathByUser(user));
    }
  }, [router]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (!formData.employeeId.trim() || !formData.password.trim()) {
      setError("Employee ID and password are required");
      return;
    }

    try {
      setLoading(true);

      let loginLocation = {
        name: "",
        coordinates: {
          latitude: null,
          longitude: null,
        },
      };

      try {
        loginLocation = await getAutoLocation();
      } catch {
        loginLocation.name = "Location unavailable";
      }

      const deviceId = getOrCreateDeviceId();
      const { data } = await api.post("/auth/login", {
        employeeId: formData.employeeId.trim(),
        password: formData.password,
        loginLocation,
        deviceId,
      });

      if (!isAdminUser(data.user)) {
        setError("Only Sales Admin, Purchase Admin & PPC Admin can access this panel");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      initSocket(data.token);

      router.push(getRedirectPathByUser(data.user));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f7fb] px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-32px)] w-full max-w-[1180px] flex-col justify-center">
        <section className="grid w-full overflow-hidden rounded-[18px] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)] lg:min-h-[78vh] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-white via-[#fff8f3] to-[#ffe0cf] p-8 lg:block xl:p-12">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff4b0b] text-white">
                <Home size={30} fill="currentColor" />
              </div>

              <img src="/logo.jpeg" alt="Serlex" className="inline-block h-8 w-auto align-middle sm:h-9" />
            </div>

            <div className="mt-12 max-w-md">
              <Typo
                as="h2"
                variant="h1"
                className="!text-[40px] !font-bold !tracking-tight !text-[#2b344d]"
              >
                Admin <span className="text-[#ff4b0b]">Control</span>
              </Typo>

              <Typo
                variant="body-lg"
                className="mt-4 !text-[18px] !leading-8 !text-[#5d667c]"
              >
                Login to manage Serlex operations from one secure dashboard.
              </Typo>
            </div>

                <div className="absolute inset-x-8 bottom-8 rounded-[28px] bg-white/70 p-5 shadow-[0_20px_50px_rgba(255,75,11,0.12)]">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ff4b0b] text-white">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <Typo
                    variant="body-sm"
                    className="!font-bold !text-[#071033]"
                  >
                    Admin access only
                  </Typo>
                  <Typo
                    variant="caption"
                    className="mt-1 block !font-medium !text-[#626a82]"
                  >
                    Only Sales Admin, Purchase Admin & PPC Admin can login.
                  </Typo>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[560px] items-center justify-center px-4 py-8 min-[360px]:px-5 sm:px-8 lg:px-12 xl:px-16">
            <div className="w-full max-w-[430px]">
              <div className="mb-7 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff4b0b] text-white lg:mx-0">
                  <ShieldCheck className="h-7 w-7" />
                </div>

                <Typo
                  as="h1"
                  variant="h2"
                  className="!text-[26px] !font-bold !text-[#071033] sm:!text-[30px]"
                >
                  Admin Login
                </Typo>

                <Typo
                  variant="body-sm"
                  className="mt-2 !text-[13px] !font-medium !leading-6 !text-[#626a82]"
                >
                  Sales Admin, Purchase Admin & PPC Admin — enter your credentials to continue.
                </Typo>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <FormField label="Employee ID" icon={User}>
                  <input
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="Enter employee ID"
                    className="h-12 w-full rounded-[10px] border border-[#e1e4ed] bg-white pl-11 pr-3 font-[var(--font-primary)] text-[13px] font-medium text-[#071033] outline-none transition focus:border-[#ff4b0b] focus:ring-4 focus:ring-[#ff4b0b]/10"
                  />
                </FormField>

                <FormField label="PIN / Password" icon={Lock}>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter PIN or password"
                    className="h-12 w-full rounded-[10px] border border-[#e1e4ed] bg-white pl-11 pr-12 font-[var(--font-primary)] text-[13px] font-medium text-[#071033] outline-none transition focus:border-[#ff4b0b] focus:ring-4 focus:ring-[#ff4b0b]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#80879a] hover:bg-[#f6f7fb] hover:text-[#ff4b0b]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </FormField>

                {error ? (
                  <div className="rounded-[10px] border border-red-100 bg-red-50 px-3 py-2.5">
                    <Typo
                      variant="caption"
                      className="!font-semibold !text-red-600"
                    >
                      {error}
                    </Typo>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] font-[var(--font-primary)] text-[14px] font-bold text-white shadow-[0_14px_28px_rgba(255,75,11,0.24)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Typo
                  variant="body-sm"
                  className="!font-medium !text-[#626a82]"
                >
                    Need a admin account?{" "}
                  <Link
                    href="/signup"
                    className="font-bold text-[#ff4b0b] hover:underline"
                  >
                    Sign up
                  </Link>
                </Typo>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FormField({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <Typo
        as="span"
        variant="caption"
        className="mb-1.5 block !font-bold !text-[#28304d]"
      >
        {label}
      </Typo>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa1b5]" />
        {children}
      </div>
    </label>
  );
}
