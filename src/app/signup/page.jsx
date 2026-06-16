"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import Typo from "@/components/ui/typo";
import api from "@/utils/api";
import { getAutoLocation } from "@/utils/location";
import { getRedirectPathByUser, getStoredUser } from "@/utils/roleRedirect";

const emptyForm = {
  employeeId: "",
  name: "",
  mobileNumber: "",
  email: "",
  department: "Administration",
  designation: "Admin",
  managerName: "",
  territory: "",
  joiningDate: "",
  dob: "",
  username: "",
  pin: "",
  confirmPin: "",
};

export default function AdminSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);

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

  const handleSignup = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    const requiredFields = [
      "employeeId",
      "name",
      "mobileNumber",
      "email",
      "department",
      "designation",
      "joiningDate",
      "dob",
      "username",
      "pin",
    ];

    const missingField = requiredFields.some((field) => !formData[field].trim());

    if (missingField) {
      setError("All required fields are mandatory");
      return;
    }

    if (formData.pin.length < 4) {
      setError("PIN must be at least 4 characters");
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      setError("PIN and confirm PIN must match");
      return;
    }

    try {
      setLoading(true);

      let signupLocation = {
        name: "",
        coordinates: {
          latitude: null,
          longitude: null,
        },
      };

      try {
        signupLocation = await getAutoLocation();
      } catch {
        signupLocation.name = "Location unavailable";
      }

      await api.post("/auth/signup", {
        employeeId: formData.employeeId.trim(),
        name: formData.name.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        managerName: formData.managerName.trim(),
        territory: formData.territory.trim(),
        joiningDate: formData.joiningDate,
        dob: formData.dob,
        username: formData.username.trim(),
        role: "admin",
        subRole: "",
        pin: formData.pin,
        signupLocation,
      });

      router.push("/login");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f7fb] px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-32px)] w-full max-w-[1180px] flex-col justify-center">
        <section className="grid w-full overflow-hidden rounded-[18px] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)] lg:min-h-[82vh] lg:grid-cols-[0.9fr_1.1fr]">
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
                Create <span className="text-[#ff4b0b]">Admin</span>
              </Typo>

              <Typo
                variant="body-lg"
                className="mt-4 !text-[18px] !leading-8 !text-[#5d667c]"
              >
                Set up a admin account for the Serlex operations panel.
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
                    Role locked to admin
                  </Typo>
                  <Typo
                    variant="caption"
                    className="mt-1 block !font-medium !text-[#626a82]"
                  >
                    This signup creates only admin panel users.
                  </Typo>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-7 min-[360px]:px-5 sm:px-8 lg:px-10 xl:px-14">
            <div className="mx-auto w-full max-w-[720px]">
              <div className="mb-6 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff4b0b] text-white lg:mx-0">
                  <ShieldCheck className="h-7 w-7" />
                </div>

                <Typo
                  as="h1"
                  variant="h2"
                  className="!text-[25px] !font-bold !text-[#071033] sm:!text-[30px]"
                >
                  Admin Sign Up
                </Typo>

                <Typo
                  variant="body-sm"
                  className="mt-2 !text-[13px] !font-medium !leading-6 !text-[#626a82]"
                >
                  Create your admin login. Fields marked for identity and PIN
                  are required.
                </Typo>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Employee ID" icon={User}>
                    <input
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      placeholder="Enter employee ID"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Full Name" icon={User}>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Mobile Number" icon={Phone}>
                    <input
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      placeholder="Enter mobile number"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Email" icon={Mail}>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Username" icon={User}>
                    <input
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Department" icon={ShieldCheck}>
                    <input
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Enter department"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Designation" icon={ShieldCheck}>
                    <input
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="Enter designation"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Manager Name" icon={User}>
                    <input
                      name="managerName"
                      value={formData.managerName}
                      onChange={handleChange}
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Territory" icon={ShieldCheck}>
                    <input
                      name="territory"
                      value={formData.territory}
                      onChange={handleChange}
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Joining Date" icon={CalendarDays}>
                    <input
                      name="joiningDate"
                      type="date"
                      value={formData.joiningDate}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Date of Birth" icon={CalendarDays}>
                    <input
                      name="dob"
                      type="date"
                      value={formData.dob}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="PIN" icon={Lock}>
                    <PinInput
                      name="pin"
                      value={formData.pin}
                      showPin={showPin}
                      onChange={handleChange}
                      onToggle={() => setShowPin((prev) => !prev)}
                    />
                  </FormField>

                  <FormField label="Confirm PIN" icon={Lock}>
                    <input
                      name="confirmPin"
                      type={showPin ? "text" : "password"}
                      value={formData.confirmPin}
                      onChange={handleChange}
                      placeholder="Confirm PIN"
                      className={`${inputClass} pr-12`}
                    />
                  </FormField>
                </div>

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
                      Creating account...
                    </>
                  ) : (
                    "Create Admin Account"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Typo
                  variant="body-sm"
                  className="!font-medium !text-[#626a82]"
                >
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#ff4b0b] hover:underline"
                  >
                    Login
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

const inputClass =
  "h-12 w-full rounded-[10px] border border-[#e1e4ed] bg-white pl-11 pr-3 font-[var(--font-primary)] text-[13px] font-medium text-[#071033] outline-none transition focus:border-[#ff4b0b] focus:ring-4 focus:ring-[#ff4b0b]/10";

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

function PinInput({ name, value, showPin, onChange, onToggle }) {
  return (
    <>
      <input
        name={name}
        type={showPin ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="Create PIN"
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#80879a] hover:bg-[#f6f7fb] hover:text-[#ff4b0b]"
        aria-label={showPin ? "Hide PIN" : "Show PIN"}
      >
        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </>
  );
}
