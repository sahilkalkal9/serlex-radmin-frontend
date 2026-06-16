"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileX2,
  Filter,
  Gauge,
  History,
  LogIn,
  LogOut,
  MapPin,
  MoreVertical,
  PieChart,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";

import Typo from "@/components/ui/typo";
import DateRangePicker from "@/components/ui/DateRangePicker";
import NotificationMenu from "@/components/NotificationMenu";
import UserMenu from "@/components/UserMenu";
import { useSetTopbar } from "@/contexts/TopbarContext";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import api from "@/utils/api";
import { getStoredUser } from "@/utils/roleRedirect";
import { logoutAndRedirect } from "@/utils/session";
import { exportAttendancePdf, exportLeadDetailPdf, exportLoginLogoutPdf, exportMeetingLeadsPdf, exportMeetingReportDetailPdf, exportMeetingsPdf, exportMeetingReportsPdf, exportPoPdf, exportSalesPdf, exportSinglePoDetailPdf } from "@/utils/pdfGenerator";

const reportStyles = {
  sales: { color: "#10a7a7", soft: "#def8f8", icon: TrendingUp },
  po: { color: "#19b96d", soft: "#dcf8e9", icon: FileSpreadsheet },
  attendance: { color: "#9a31ef", soft: "#f2ddff", icon: Users },
  "login-logout": { color: "#1d86f5", soft: "#e4f1ff", icon: LogIn },
  meetings: { color: "#f29322", soft: "#fff0dd", icon: BarChart3 },
  other: { color: "#ee3d83", soft: "#ffe3ef", icon: FileText },
  "target-achievement": { color: "#3c63f3", soft: "#e7ecff", icon: Target },
};

const defaultRange = () => {
  const now = new Date();
  return {
    fromDate: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA"),
    toDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-CA"),
  };
};

const yearRange = () => {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    fromDate: new Date(start, 3, 1).toLocaleDateString("en-CA"),
    toDate: new Date(start + 1, 2, 31).toLocaleDateString("en-CA"),
  };
};

const monthRange = () => {
  const now = new Date();
  return {
    fromDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("en-CA"),
    toDate: now.toLocaleDateString("en-CA"),
  };
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
};

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(Math.round(Number(value || 0)));
const formatMoney = (value) => {
  const v = Number(value || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
};

function userName(user) {
  return user?.name || user?.username || user?.email?.split("@")?.[0] ||     "Admin User";
}

const roleLabels = {
  sales_user: "Sales Executive",
  ppc_user: "PPC User",
  purchase_user: "Purchase Executive",
  subadmin: "Subadmin",
  sales_manager: "Sales Manager",
  ppc_manager: "PPC Manager",
  purchase_manager: "Purchase Manager",
  admin: "Admin",
};

function formatRole(row) {
  if (!row.role) return row.designation || "";
  if (row.role === "subadmin" && row.subRole) return roleLabels[row.subRole] || row.subRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return roleLabels[row.role] || row.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function exportCsv(fileName, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + csv);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function Header({ title, subtitle, children }) {
  useSetTopbar({ title, subtitle, children });
  return null;
}

function SelectBox({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`min-w-0 ${className}`}>
      {label ? <span className="mb-1.5 block text-[11px] font-bold text-[#263065]">{label}</span> : null}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none">
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function PeriodTabs({ value, onChange, includeDaily = false }) {
  const tabs = includeDaily ? ["Daily", "Monthly", "Quarterly", "Yearly"] : ["Monthly", "Quarterly", "Yearly"];
  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-[8px] border border-[#e7e9f1] bg-white p-0.5 min-[520px]:inline-grid min-[520px]:w-auto" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(74px, 1fr))` }}>
      {tabs.map((tab) => (
        <button key={tab} onClick={() => onChange(tab)} className={`h-10 rounded-[7px] px-3 text-[12px] font-bold ${value === tab ? "border border-[#ff744b] text-[#ff4b0b]" : "text-[#17205d]"}`}>
          {tab}
        </button>
      ))}
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[#e7e9f1] bg-white px-4 text-[12px] font-bold text-[#20285f] hover:border-[#ffb396] transition">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ExportDropdown({ onExport, hideCsv = false }) {
  const [open, setOpen] = useState(false);

  const handleExport = (format) => {
    setOpen(false);
    onExport?.(format);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[#e7e9f1] bg-white px-4 text-[12px] font-bold text-[#20285f] hover:border-[#ffb396] transition"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close export menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div className="absolute right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-[10px] border border-[#e3e6ee] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
            {!hideCsv && (
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="flex w-full items-center gap-2 px-4 py-3 text-[12px] font-bold text-[#20285f] transition hover:bg-[#fbfbfd]"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#19b96d]" />
                Export as CSV
              </button>
            )}
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="flex w-full items-center gap-2 px-4 py-3 text-[12px] font-bold text-[#20285f] transition hover:bg-[#fbfbfd]"
            >
              <FileText className="h-4 w-4 text-[#ff4b0b]" />
              Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, color = "#1d86f5" }) {
  return (
    <article className="flex min-h-[118px] items-center gap-4 rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.035)]">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${color}18`, color }}>
        <Icon className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold text-[#4e5a8d]">{label}</p>
        <p className="mt-2 truncate text-[22px] font-bold text-[#0a0c60]">{value}</p>
        <p className="mt-1 truncate text-[11px] font-bold text-[#68729d]">{note}</p>
      </div>
    </article>
  );
}

function Panel({ title, children, action }) {
  return (
    <section className="min-w-0 rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-[14px] font-bold text-[#10145a]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BarChart({ data, bars, maxValue, totalEmployees }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  if (!data.length) return <div className="grid h-[230px] place-items-center text-[12px] font-bold text-[#7a83a8]">No data</div>;

  const max = maxValue || Math.max(1, ...data.flatMap((item) => bars.map((bar) => Number(item[bar.key] || 0))));
  const padding = { top: 20, right: 12, bottom: 36, left: 4 };
  const w = data.length * 56;
  const h = 220;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barGap = 3;
  const groupWidth = chartW / data.length;
  const barWidth = Math.max(4, (groupWidth - barGap * 2) / bars.length);
  const yAxisSteps = 4;

  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => Math.round((max / yAxisSteps) * i));

  const getBarAt = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const svgScroll = containerRef.current.scrollLeft || 0;
    const sx = x + svgScroll;
    if (sx < padding.left || sx > w - padding.right) return null;
    const gi = Math.floor((sx - padding.left) / groupWidth);
    if (gi < 0 || gi >= data.length) return null;
    const item = data[gi];
    const gx = padding.left + gi * groupWidth;
    const relX = sx - gx - barGap;
    const bi = Math.round(relX / (barWidth + barGap));
    if (bi < 0 || bi >= bars.length) return null;
    return { item, bar: bars[bi] };
  };

  return (
    <div ref={containerRef} className="relative min-h-[230px] overflow-x-auto" onMouseMove={(e) => {
      const hit = getBarAt(e.clientX);
      if (hit) setTooltip({ ...hit, value: Number(hit.item[hit.bar.key] || 0), x: e.clientX, y: e.clientY });
      else setTooltip(null);
    }} onMouseLeave={() => setTooltip(null)}>
      <svg width={Math.max(w, 280)} height={h} className="block min-w-0 pointer-events-none">
        {yAxisLabels.map((label, i) => {
          const y = padding.top + chartH - (label / max) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke="#eef0f6" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" className="text-[9px]" fill="#7a83a8">{label}</text>
            </g>
          );
        })}
        {data.map((item, gi) => {
          const gx = padding.left + gi * groupWidth;
          return (
            <g key={item.label}>
              {bars.map((bar, bi) => {
                const value = Number(item[bar.key] || 0);
                const bx = gx + barGap + bi * (barWidth + barGap);
                const bh = Math.max((value / max) * chartH, 1);
                const by = padding.top + chartH - bh;
                return <rect key={bar.key} x={bx} y={by} width={barWidth} height={bh} rx={2} fill={bar.color} />
              })}
              <text x={gx + groupWidth / 2} y={h - 8} textAnchor="middle" className="text-[9px]" fill="#657098">{item.label}</text>
            </g>
          );
        })}
      </svg>
      {tooltip && ( 
        <div className="pointer-events-none fixed z-50 rounded-[6px] bg-[#1a1f3a] px-3 py-2 text-[11px] text-white shadow-lg" style={{ left: tooltip.x > window.innerWidth / 2 ? "auto" : tooltip.x + 12, right: tooltip.x > window.innerWidth / 2 ? window.innerWidth - tooltip.x + 12 : "auto", top: tooltip.y - 36 }}>
          <p className="mb-1 font-semibold">{tooltip.item.label}</p>
          {bars.map((b) => {
            const val = Number(tooltip.item[b.key] || 0);
            const countKey = b.key + "Count";
            const count = tooltip.item[countKey];
            const denom = tooltip.item.totalCount || totalEmployees;
            const suffix = b.format === "money" ? "" : "%";
            return <p key={b.key} className="leading-5" style={{ color: b.color }}>{b.key.charAt(0).toUpperCase() + b.key.slice(1)}: {b.format === "money" ? formatMoney(val) : formatNumber(val)}{suffix}{count != null ? ` (${formatNumber(count)} / ${formatNumber(denom)})` : ""}</p>;
          })}
        </div>
      )}
    </div>
  );
}

function LineChart({ data, lines, totalEmployees }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  if (!data.length) return <div className="grid h-[230px] place-items-center text-[12px] font-bold text-[#7a83a8]">No data</div>;

  const max = Math.max(100, ...data.flatMap((item) => lines.map((line) => Number(item[line.key] || 0))));
  const padding = { top: 20, right: 12, bottom: 36, left: 4 };
  const w = data.length * 60;
  const h = 220;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const stepX = chartW / Math.max(data.length - 1, 1);
  const yAxisSteps = 4;
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => Math.round((max / yAxisSteps) * i));

  const point = (item, key) => {
    const i = data.indexOf(item);
    return { x: padding.left + i * stepX, y: padding.top + chartH - (Number(item[key] || 0) / max) * chartH };
  };

  const getDotAt = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left + (containerRef.current.scrollLeft || 0);
    if (x < padding.left || x > w - padding.right) return null;
    const di = Math.round((x - padding.left) / stepX);
    if (di < 0 || di >= data.length) return null;
    return { item: data[di] };
  };

  return (
    <div ref={containerRef} className="relative min-h-[230px] overflow-x-auto" onMouseMove={(e) => {
      const hit = getDotAt(e.clientX);
      if (hit) setTooltip({ ...hit, x: e.clientX, y: e.clientY });
      else setTooltip(null);
    }} onMouseLeave={() => setTooltip(null)}>
      <svg width={Math.max(w, 280)} height={h} className="block min-w-0 pointer-events-none">
        {yAxisLabels.map((label, i) => {
          const y = padding.top + chartH - (label / max) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke="#eef0f6" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" className="text-[9px]" fill="#7a83a8">{label}</text>
            </g>
          );
        })}
        {lines.map((line) => {
          const pts = data.map((item) => point(item, line.key));
          const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          return (
            <g key={line.key}>
              <path d={`${pathD} L ${pts[pts.length - 1].x} ${padding.top + chartH} L ${pts[0].x} ${padding.top + chartH} Z`} fill={line.color} fillOpacity={0.08} />
              <path d={pathD} fill="none" stroke={line.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" stroke={line.color} strokeWidth={2} />)}
            </g>
          );
        })}
        {data.map((item, i) => (
          <text key={item.label} x={padding.left + i * stepX} y={h - 8} textAnchor="middle" className="text-[9px]" fill="#657098">{item.label}</text>
        ))}
      </svg>
      {tooltip && (
        <div className="pointer-events-none fixed z-50 rounded-[6px] bg-[#1a1f3a] px-3 py-2 text-[11px] text-white shadow-lg" style={{ left: tooltip.x > window.innerWidth / 2 ? "auto" : tooltip.x + 12, right: tooltip.x > window.innerWidth / 2 ? window.innerWidth - tooltip.x + 12 : "auto", top: tooltip.y - 36 }}>
          <p className="mb-1 font-semibold">{tooltip.item?.label}</p>
          {lines.map((l) => {
            const val = Number(tooltip.item?.[l.key] || 0);
            const countKey = l.key + "Count";
            const count = tooltip.item?.[countKey];
            const denom = tooltip.item?.totalCount || totalEmployees;
            return <p key={l.key} className="leading-5" style={{ color: l.color }}>{l.key.charAt(0).toUpperCase() + l.key.slice(1)}: {formatNumber(val)}%{count != null ? ` (${formatNumber(count)} / ${formatNumber(denom)})` : ""}</p>;
          })}
        </div>
      )}
    </div>
  );
}

function DonutList({ total, centerLabel, rows, colors = ["#2f80ed", "#35c46b", "#ff9f1c", "#9437ef", "#14a8c4", "#ff4b55"] }) {
  const [tooltip, setTooltip] = useState(null);
  const safeRows = rows.length && rows.some((r) => Number(r.share || 0) > 0) ? rows : [{ label: "No Data", share: 100, count: 0 }];
  const cx = 90, cy = 90, r = 80, ir = 50;
  const toRad = (deg) => (deg - 90) * (Math.PI / 180);
  const arc = (start, end) => {
    const startDeg = start * 3.6;
    const endDeg = end * 3.6;
    const startAngle = toRad(startDeg);
    const endAngle = toRad(endDeg);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${cx + ir * Math.cos(endAngle)} ${cy + ir * Math.sin(endAngle)} A ${ir} ${ir} 0 ${large} 0 ${cx + ir * Math.cos(startAngle)} ${cy + ir * Math.sin(startAngle)} Z`;
  };

  const segments = safeRows.reduce((acc, row, i) => {
    const start = acc.cursor;
    const end = start + Number(row.share || 0);
    acc.list.push({ row, path: arc(start, end), color: colors[i % colors.length], label: row.label || row.department });
    return { cursor: end, list: acc.list };
  }, { cursor: 0, list: [] }).list;

  return (
    <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="shrink-0">
        <svg width={160} height={160} viewBox="0 0 180 180" className="block max-w-full"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const scale = 180 / rect.width;
            const svgX = (e.clientX - rect.left) * scale;
            const svgY = (e.clientY - rect.top) * scale;
            const dx = svgX - cx, dy = svgY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ir || dist > r) { setTooltip(null); return; }
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            let pct = angle / 360 * 100;
            let acc = 0;
            for (const seg of segments) {
              const segPct = Number(seg.row.share || 0);
              if (pct >= acc && pct <= acc + segPct + 0.01) { setTooltip({ ...seg, x: e.clientX, y: e.clientY }); return; }
              acc += segPct;
            }
            setTooltip(null);
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          {segments.map((seg, i) => (
            <path key={i} d={seg.path} fill={seg.color} opacity={0.92} className="transition-opacity hover:opacity-100" />
          ))}
          <circle cx={cx} cy={cy} r={ir} fill="white" />
          <text x={cx} y={cy - 8} textAnchor="middle" className="text-[20px] font-bold" fill="#0a0c60">{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px] font-bold" fill="#68729d">{centerLabel}</text>
        </svg>
      </div>
      <div className="w-full min-w-0 space-y-2">
        {safeRows.map((row, index) => (
          <div key={row.label} className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-2 text-[11px] font-bold text-[#27306c]"
            onMouseEnter={(e) => setTooltip({ row, label: row.label || row.department, color: colors[index % colors.length], x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => setTooltip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
            onMouseLeave={() => setTooltip(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="truncate">{row.label || row.department}</span>
            <span className="whitespace-nowrap">{row.count ?? row.meetings ?? ""}</span>
            <span className="whitespace-nowrap">{row.share || 0}%</span>
          </div>
        ))}
      </div>
      {tooltip && (
        <div className="pointer-events-none fixed z-50 rounded-[6px] bg-[#1a1f3a] px-3 py-2 text-[11px] text-white shadow-lg" style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}>
          <p className="font-semibold" style={{ color: tooltip.color }}>{tooltip.label}</p>
          <p className="leading-5">{tooltip.row.count ?? tooltip.row.meetings ?? ""} — {tooltip.row.share || 0}%</p>
        </div>
      )}
    </div>
  );
}

function ProgressList({ rows, labelKey = "name", valueKey = "activeHoursValue", suffix = "h" }) {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return (
    <div className="space-y-4">
      {rows.length ? rows.map((row) => (
        <div key={row.id || row[labelKey]} className="grid grid-cols-[minmax(90px,130px)_1fr_auto] items-center gap-3">
          <span className="truncate text-[11px] font-bold text-[#27306c]">{row[labelKey]}</span>
          <span className="h-2 overflow-hidden rounded-full bg-[#eef2fb]">
            <span className="block h-full rounded-full bg-[#2f80ed]" style={{ width: `${(Number(row[valueKey] || 0) / max) * 100}%` }} />
          </span>
          <span className="text-[10px] font-bold text-[#53608f]">{row.activeHours || `${row[valueKey] || 0}${suffix}`}</span>
        </div>
      )) : <p className="py-10 text-center text-[12px] font-bold text-[#7a83a8]">No data found.</p>}
    </div>
  );
}

function PageShell({ children, title, subtitle, topbarChildren }) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#08104a]">
      <Header title={title} subtitle={subtitle} children={topbarChildren} />
      <div className="mx-auto w-full max-w-[1780px] space-y-5 px-3 py-4 sm:px-5 lg:px-7">{children}</div>
    </main>
  );
}

export function ReportsHome() {
  const range = useMemo(() => defaultRange(), []);
  const [fromDate, setFromDate] = useState(range.fromDate);
  const [toDate, setToDate] = useState(range.toDate);
  const [data, setData] = useState({ categories: [], reports: [], options: { departments: [], users: [] } });
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [reportFor, setReportFor] = useState("all");
  const [generatedBy, setGeneratedBy] = useState("all");

  const fetchReports = useCallback(async () => {
    const response = await api.get("/admin/reports/overview", { params: { fromDate, toDate } });
    setData(response.data || {});
  }, [fromDate, toDate]);

  useEffect(() => {
    const load = async () => fetchReports().catch((error) => console.error("Reports fetch error:", error));
    load();
  }, [fetchReports]);

  const reports = (data.reports || []).filter((report) => {
    if (reportFor !== "all" && report.id !== reportFor) return false;
    return `${report.name} ${report.category} ${report.description}`.toLowerCase().includes(search.toLowerCase());
  });

  const deptOptions = [{ value: "all", label: "All Departments" }, ...(data.options?.departments || []).map((item) => ({ value: item, label: item }))];
  const userOptions = [{ value: "all", label: "All" }, ...(data.options?.users || []).map((item) => ({ value: item._id, label: userName(item) }))];

  return (
    <PageShell title="Reports" subtitle="View and export reports across all modules">
      <Panel title="Report Categories">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-[1380px]:grid-cols-7">
          {(data.categories || []).filter((cat) => cat.id !== "other").sort((a, b) => {
            const order = ["attendance", "login-logout"];
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          }).map((category) => {
            const style = reportStyles[category.id] || reportStyles.other;
            const Icon = style.icon;
            return (
              <Link key={category.id} href={`/reports/${category.id}`} className="flex min-h-[205px] flex-col items-center justify-center rounded-[8px] border border-[#e8ebf2] p-4 text-center transition hover:-translate-y-0.5 hover:border-[#ffb396]">
                <span className="grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: style.soft, color: style.color }}>
                  <Icon className="h-8 w-8" />
                </span>
                <h3 className="mt-4 text-[14px] font-bold" style={{ color: style.color }}>{category.title}</h3>
                <p className="mt-3 min-h-10 text-[11px] font-bold leading-5 text-[#53608f]">{category.description}</p>
              </Link>
            );
          })}
        </div>
      </Panel>

      <Panel title="Filter & Export">
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePicker fromDate={fromDate} toDate={toDate} appliedFromDate={fromDate} appliedToDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onApply={() => {}} onReset={() => {}} />
          <SelectBox className="min-w-[140px] flex-1" label="Department" value={department} onChange={setDepartment} options={deptOptions} />
          <SelectBox className="min-w-[140px] flex-1" label="Report For" value={reportFor} onChange={setReportFor} options={[{ value: "all", label: "All" }, ...(data.categories || []).map((item) => ({ value: item.id, label: item.title }))]} />
          <SelectBox className="min-w-[140px] flex-1" label="Generated By" value={generatedBy} onChange={setGeneratedBy} options={userOptions} />
          <div className="flex items-end gap-2">
            <ExportDropdown onExport={(format) => {
              if (format === "csv") exportCsv("reports.csv", reports.map((row) => [row.name, row.category, row.description, row.frequency]));
              if (format === "pdf") window.print();
            }} />
          </div>
        </div>
      </Panel>

      <Panel title="Reports List" action={<div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports..." className="h-10 w-[min(320px,45vw)] rounded-[8px] border border-[#e7e9f1] px-3 text-[12px] font-bold" /><ToolButton icon={Filter} label="Filters" /></div>}>
        <Table
          columns={[
            { key: "sno", label: "S.No.", render: (_, index) => index + 1, minWidth: "50px", sortable: false },
            { key: "name", label: "Report Name", minWidth: "150px" },
            { key: "category", label: "Category", minWidth: "120px" },
            { key: "description", label: "Description", minWidth: "200px" },
            { key: "frequency", label: "Frequency", minWidth: "90px" },
            { key: "lastGeneratedOn", label: "Last Generated On", render: (row) => formatDateTime(row.lastGeneratedOn), minWidth: "140px" },
            { key: "actions", label: "Actions", render: (row) => <div className="flex gap-3"><Link href={`/reports/${row.id}`}><Eye className="h-4 w-4 text-[#6270a2]" /></Link><Download className="h-4 w-4 text-[#19b96d]" /><MoreVertical className="h-4 w-4 text-[#6270a2]" /></div>, minWidth: "100px", sortable: false },
          ]}
          data={reports}
        />
      </Panel>
    </PageShell>
  );
}

function periodToRange(period) {
  const now = new Date();
  if (period === "Monthly") {
    return {
      fromDate: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA"),
      toDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-CA"),
    };
  }
  if (period === "Quarterly") {
    const q = Math.floor(now.getMonth() / 3);
    return {
      fromDate: new Date(now.getFullYear(), q * 3, 1).toLocaleDateString("en-CA"),
      toDate: new Date(now.getFullYear(), q * 3 + 3, 0).toLocaleDateString("en-CA"),
    };
  }
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    fromDate: new Date(year, 3, 1).toLocaleDateString("en-CA"),
    toDate: new Date(year + 1, 2, 31).toLocaleDateString("en-CA"),
  };
}

function rangeToPeriod(fromDate, toDate) {
  const diff = (new Date(toDate) - new Date(fromDate)) / 86400000;
  if (diff <= 35) return "Monthly";
  if (diff <= 100) return "Quarterly";
  return "Yearly";
}

function ReportFilters({ period, setPeriod, options, filters, setFilters, fromDate, toDate, setFromDate, setToDate, onExport, showExport = true }) {
  const users = [{ value: "all", label: "All Users" }, ...(options?.users || []).map((item) => ({ value: item._id, label: userName(item) }))];

  const onApply = useCallback(() => {}, []);
  const onResetFilter = useCallback(() => {
    const now = new Date();
    const defFrom = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA");
    const defTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-CA");
    setFromDate(defFrom);
    setToDate(defTo);
  }, [setFromDate, setToDate]);

  const handlePeriodChange = useCallback((next) => {
    setPeriod(next);
    const range = periodToRange(next);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }, [setPeriod, setFromDate, setToDate]);

  const handleFromDateChange = useCallback((d) => {
    setFromDate(d);
    setPeriod(rangeToPeriod(d, toDate));
  }, [setFromDate, setPeriod, toDate]);

  const handleToDateChange = useCallback((d) => {
    setToDate(d);
    setPeriod(rangeToPeriod(fromDate, d));
  }, [setToDate, setPeriod, fromDate]);

  return (
    <Panel title="">
      <div className="flex flex-wrap items-end gap-3">
        <PeriodTabs value={period} onChange={handlePeriodChange} />
        <DateRangePicker fromDate={fromDate} toDate={toDate} appliedFromDate={fromDate} appliedToDate={toDate} setFromDate={handleFromDateChange} setToDate={handleToDateChange} onApply={onApply} onReset={onResetFilter} />
        <div className="flex min-w-[200px] flex-1 flex-wrap items-end gap-3">
          <SelectBox className="min-w-[140px] flex-1" value={filters.salesManager} onChange={(value) => setFilters((prev) => ({ ...prev, salesManager: value }))} options={users} />
        </div>
        {showExport && <div className="flex items-end gap-2">
          <ExportDropdown onExport={onExport} />
        </div>}
      </div>
    </Panel>
  );
}

function useReport(endpoint, initialRange) {
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [filters, setFilters] = useState({ department: "all", salesManager: "all" });
  const [data, setData] = useState({ options: {}, summary: {}, monthly: [], monthlyTeam: [], managerRows: [], teamRows: [], departmentRows: [], employeeRows: [] });

  const fetchData = useCallback(async () => {
    const response = await api.get(endpoint, { params: { fromDate, toDate, ...filters } });
    setData(response.data || {});
  }, [endpoint, filters, fromDate, toDate]);

  useEffect(() => {
    const load = async () => fetchData().catch((error) => console.error(`${endpoint} fetch error:`, error));
    load();
  }, [fetchData, endpoint]);

  return { fromDate, toDate, setFromDate, setToDate, filters, setFilters, data };
}
 
export function SalesReport({ targetMode = false }) {
  const router = useRouter();
  const report = useReport(targetMode ? "/admin/reports/target-achievement" : "/admin/reports/sales", monthRange());
  const [period, setPeriod] = useState("Monthly");
  const [selectedRow, setSelectedRow] = useState(null);
  const summary = useMemo(() => report.data.summary || {}, [report.data.summary]);
  const managerRows = useMemo(() => report.data.managerRows || [], [report.data.managerRows]);
  const teamRows = useMemo(() => report.data.teamRows || [], [report.data.teamRows]);
  const monthly = useMemo(() => report.data.monthly || [], [report.data.monthly]);
  const monthlyTeam = useMemo(() => report.data.monthlyTeam || [], [report.data.monthlyTeam]);

  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  }, [loggingOut, router]);

  const currentUserName = currentUser?.name || currentUser?.email?.split("@")?.[0] || "Admin";

  const topbarChildren = useMemo(() => (
    <div className="grid w-full grid-cols-1 gap-2 min-[520px]:grid-cols-[48px_minmax(172px,auto)] min-[900px]:w-auto min-[900px]:grid-cols-[48px_auto]">
      <NotificationMenu count={notifications.length} items={notifications} />
      <UserMenu
        userName={currentUserName}
        userInitials={currentUserName.slice(0, 2).toUpperCase()}
        onDashboard={() => router.push("/dashboard")}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </div>
  ), [notifications, currentUserName, router, handleLogout, loggingOut]);

  const exportRows = useMemo(() => managerRows.map((row) => [row.name, row.target, row.achieved, row.achievement, row.variance]), [managerRows]);

  const aggregate = useCallback((data) => {
    if (!data.length) return data;
    if (period === "Quarterly") {
      const out = [];
      data.forEach((item, i) => {
        const qi = Math.floor(i / 3);
        if (!out[qi]) out[qi] = { label: `Q${qi + 1}`, target: 0, achieved: 0 };
        out[qi].target += item.target;
        out[qi].achieved += item.achieved;
      });
      return out.map((o) => ({ ...o, achievement: o.target > 0 ? Number(((o.achieved / o.target) * 100).toFixed(2)) : 0 }));
    }
    if (period === "Yearly") {
      const total = data.reduce((acc, item) => ({ target: acc.target + item.target, achieved: acc.achieved + item.achieved }), { target: 0, achieved: 0 });
      return [{ label: new Date().getFullYear().toString(), ...total, achievement: total.target > 0 ? Number(((total.achieved / total.target) * 100).toFixed(2)) : 0 }];
    }
    return data;
  }, [period]);

  const chartData = useMemo(() => aggregate(monthly), [aggregate, monthly]);
  const chartTeamData = useMemo(() => aggregate(monthlyTeam), [aggregate, monthlyTeam]);
  const hasTeamData = teamRows.some((r) => r.target > 0 || r.achieved > 0);

  return (
    <PageShell title={targetMode ? "Target vs Achievement Report" : "Sales Report"} subtitle={targetMode ? "Track and compare targets against achievements." : "View and analyze sales performance against targets."} topbarChildren={topbarChildren}>
      <span className="contents">
      <ReportFilters period={period} setPeriod={setPeriod} options={report.data.options} filters={report.filters} setFilters={report.setFilters} fromDate={report.fromDate} toDate={report.toDate} setFromDate={report.setFromDate} setToDate={report.setToDate} onExport={(format) => {
        if (format === "csv") {
          if (targetMode) {
            const summaryRow = ["Overall Summary", "", `Total Target: ₹ ${formatNumber(summary.totalTarget)}`, `Total Achieved: ₹ ${formatNumber(summary.totalAchieved)}`, `Achievement: ${summary.achievementPercent || 0}%`, `Remaining: ₹ ${formatNumber(summary.variance)}`, `Avg Monthly: ${summary.avgMonthlyAchievement || 0}%`, `Managers Achieved: ${summary.achievedManagers || 0}/${summary.totalManagers || 0}`];
            const managerHeader = ["Section", "Name", "Department", "Target", "Achieved", "Achievement %", "Remaining", "POs"];
            const managerExportRows = managerRows.map((row) => ["Manager", row.name || "-", row.department || "-", `₹ ${formatNumber(row.target)}`, `₹ ${formatNumber(row.achieved)}`, `${row.achievement || 0}%`, `₹ ${formatNumber(row.variance)}`, row.pos?.length || 0]);
            const teamExportRows = teamRows.map((row) => ["Executive", `${row.name || "-"}`, `${row.department || "-"} (Mgr: ${row.managerName || "-"})`, `₹ ${formatNumber(row.target)}`, `₹ ${formatNumber(row.achieved)}`, `${row.achievement || 0}%`, `₹ ${formatNumber(row.variance)}`, row.pos?.length || 0]);
            const allRows = [summaryRow, [], managerHeader, ...managerExportRows, ...teamExportRows];
            const quarterly = report.data.quarterly || [];
            if (quarterly.length > 0) {
              const qHeader = ["Quarter", "Target", "Achieved", "Achievement %", "Remaining"];
              const qRows = quarterly.map((q) => [q.label || q.quarter || "-", `₹ ${formatNumber(q.target)}`, `₹ ${formatNumber(q.achieved)}`, `${q.achievement || 0}%`, `₹ ${formatNumber(q.variance)}`]);
              const allSectionRows = [...allRows, [], ["Quarterly Breakdown", "", "", "", ""], qHeader, ...qRows];
              exportCsv(`target-achievement-${report.fromDate}-to-${report.toDate}.csv`, allSectionRows);
            } else {
              exportCsv(`target-achievement-${report.fromDate}-to-${report.toDate}.csv`, allRows);
            }
          } else {
            const summaryRow = ["Overall Summary", "", "", `Total Target: ₹ ${formatNumber(summary.totalTarget)}`, `Total Achieved: ₹ ${formatNumber(summary.totalAchieved)}`, `Achievement: ${summary.achievementPercent || 0}%`, `Remaining: ₹ ${formatNumber(summary.variance)}`, ""];
            const headerRow = ["Name", "Manager", "Department", "Target", "Achieved", "Achievement %", "Remaining", "POs"];
            const rows = teamRows.map((row) => [row.name || "-", row.managerName || "-", row.department || "-", `₹ ${formatNumber(row.target)}`, `₹ ${formatNumber(row.achieved)}`, `${row.achievement || 0}%`, `₹ ${formatNumber(row.variance)}`, row.pos?.length || 0]);
            exportCsv(`sales-${report.fromDate}-to-${report.toDate}.csv`, [summaryRow, [], headerRow, ...rows]);
          }
        }
        if (format === "pdf") exportSalesPdf({ managerRows, teamRows, summary, monthly, filters: report.filters, fromDate: report.fromDate, toDate: report.toDate, targetMode });
      }} />
      </span>
      <div className="flex flex-wrap gap-3 mt-4">
        <MetricCard icon={Target} label="Total Target" value={formatMoney(summary.totalTarget)} note="100% of target" color="#1d86f5" />
        <MetricCard icon={CheckCircle2} label="Total Achievement" value={formatMoney(summary.totalAchieved)} note={`${summary.achievementPercent || 0}% of target`} color="#19b96d" />
        <MetricCard icon={BarChart3} label="Remaining" value={formatMoney(summary.variance)} note={`${Math.max(0, 100 - Number(summary.achievementPercent || 0)).toFixed(2)}% gap`} color="#f29322" />
        <MetricCard icon={TrendingUp} label="Achievement %" value={`${summary.achievementPercent || 0}%`} note="Overall" color="#9a31ef" />
        {targetMode && <MetricCard icon={PieChart} label="Avg. Monthly Achievement" value={`${summary.avgMonthlyAchievement || 0}%`} note="Avg. achievement %" color="#10a7a7" />}
        {targetMode && <MetricCard icon={Users} label="Managers" value={`${summary.achievedManagers || 0}/${summary.totalManagers || 0}`} note="Achieved target" color="#3c63f3" />}
      </div>
      {targetMode ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="Quarterly Target vs Achievement">
            <BarChart data={report.data.quarterly || []} bars={[{ key: "target", color: "#2f80ed", format: "money" }, { key: "achieved", color: "#35c46b", format: "money" }]} />
          </Panel>
          <Panel title="Team Target vs Achievement">
            <BarChart data={chartTeamData} bars={[{ key: "target", color: "#9437ef", format: "money" }, { key: "achieved", color: "#14a8c4", format: "money" }]} />
          </Panel>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <Panel title={hasTeamData ? "Team Target vs Achievement" : "Per Sales Manager"}>
            <BarChart data={hasTeamData ? chartTeamData : chartData} bars={[{ key: "target", color: "#9437ef", format: "money" }, { key: "achieved", color: "#14a8c4", format: "money" }]} />
          </Panel>
        </div>
      )}
      <div className="space-y-4">
        {targetMode ? (
          <>
            <Panel title={`Target Achieved by Managers (${managerRows.length})`}>
              <Table columns={moneyColumns("Manager", setSelectedRow)} data={managerRows} paginated={false} sortable={false} />
            </Panel>
            <Panel title={`Target Achieved by Users (${teamRows.length})`}>
              <Table columns={moneyColumns("User", setSelectedRow)} data={teamRows} paginated={false} sortable={false} />
            </Panel>
          </>
        ) : (
          <Panel title="Target of Executives">
            <Table columns={moneyColumns("Team", setSelectedRow)} data={teamRows} paginated={false} sortable={false} />
          </Panel>
        )}
      </div>
      <Modal open={!!selectedRow} onClose={() => setSelectedRow(null)} title={selectedRow?.name || ""} subtitle={selectedRow?.managerName ? `Manager: ${selectedRow.managerName}` : `Department: ${selectedRow?.department || "-"}`} wide>
        <div className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-4 min-[380px]:px-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#1d86f5] px-3 py-1 text-[11px] font-bold text-white">Target: {formatMoney(selectedRow?.target)}</span>
              <span className="rounded-full bg-[#19b96d] px-3 py-1 text-[11px] font-bold text-white">Achieved: {formatMoney(selectedRow?.achieved)}</span>
              <span className="rounded-full bg-[#ff9f1c] px-3 py-1 text-[11px] font-bold text-white">Achievement: {selectedRow?.achievement || 0}%</span>
              <span className="rounded-full bg-[#ff4b55] px-3 py-1 text-[11px] font-bold text-white">Remaining: {formatMoney(selectedRow?.variance)}</span>
            </div>
            <div className="shrink-0">
              <ExportDropdown onExport={(format) => {
                if (format === "csv") {
                  const infoRow = ["Name", selectedRow?.name || "-", "Target", `₹ ${formatNumber(selectedRow?.target)}`, "Achieved", `₹ ${formatNumber(selectedRow?.achieved)}`, "Achievement %", `${selectedRow?.achievement || 0}%`, "Remaining", `₹ ${formatNumber(selectedRow?.variance)}`, "POs", selectedRow?.pos?.length || 0, "", ""];
                  const headerRow = ["PO No.", "Company", "Vendor", "Value", "Date", "Category", "Status", "Activity", "Tracking"];
                  const rows = (selectedRow?.pos || []).map((po) => [
                    po.poNo || "-", po.companyName || "-", po.vendorCompany || po.vendorName || "-", formatMoney(po.poValue), formatDate(po.poDate), po.category || "-", po.status || "-", po.activityStatus || "-", po.trackingStatus || "-",
                  ]);
                  exportCsv(`pos-${selectedRow?.name || "user"}-${report.fromDate}-to-${report.toDate}.csv`, [infoRow, [], headerRow, ...rows]);
                }
                if (format === "pdf") exportSalesPdf({ managerRows: [selectedRow], teamRows: [], summary: { totalTarget: selectedRow.target, totalAchieved: selectedRow.achieved, variance: selectedRow.variance, achievementPercent: selectedRow.achievement }, filters: { salesManager: selectedRow.name }, fromDate: report.fromDate, toDate: report.toDate, targetMode });
              }} />
            </div>
          </div>
          <p className="mb-3 text-[13px] font-bold text-[#0a0c60]">
            Purchase Orders ({selectedRow?.pos?.length || 0})
          </p>
          {selectedRow?.pos?.length > 0 ? (
            <div className="overflow-x-auto rounded-[12px] border border-[#eef0f6]">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#eef0f6] bg-[#fbfbfd]">
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">PO No.</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Company</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Vendor</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Value</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Date</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Category</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Status</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Activity</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-[#7580a5]">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.pos.map((po, idx) => (
                    <tr key={po._id || idx} className="border-b border-[#eef0f6] hover:bg-[#fbfbfd]">
                      <td className="px-3 py-2.5 text-[12px] font-bold text-[#071033]">{po.poNo || "-"}</td>
                      <td className="px-3 py-2.5 text-[12px] text-[#071033]">{po.companyName || "-"}</td>
                      <td className="px-3 py-2.5 text-[12px] text-[#071033]">{po.vendorCompany || po.vendorName || "-"}</td>
                      <td className="px-3 py-2.5 text-[12px] font-bold text-[#2ea44f]">{formatMoney(po.poValue)}</td>
                      <td className="px-3 py-2.5 text-[11px] text-[#7580a5]">{formatDate(po.poDate)}</td>
                      <td className="px-3 py-2.5 text-[12px] text-[#071033]">{po.category || "-"}</td>
                      <td className="px-3 py-2.5"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${po.status === "Completed" || po.status === "Payment Received" ? "bg-[#eefaf2] text-[#1f7a43]" : po.status === "Delayed" ? "bg-[#fff2ed] text-[#cc4b37]" : "bg-[#f3f5ff] text-[#5a67d8]"}`}>{po.status || "-"}</span></td>
                      <td className="px-3 py-2.5 text-[12px] text-[#071033]">{po.activityStatus || "-"}</td>
                      <td className="px-3 py-2.5 text-[12px] text-[#071033]">{po.trackingStatus || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] font-semibold text-[#7a83a8]">No purchase orders found for this record.</p>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}

function moneyColumns(label, onDetails) {
  return [
    { key: "name", label, render: (row) => row.name || row.department, minWidth: "120px" },
    { key: "target", label: "Target", render: (row) => formatMoney(row.target), minWidth: "100px", align: "right" },
    { key: "achieved", label: "Achieved", render: (row) => formatMoney(row.achieved), minWidth: "100px", align: "right" },
    { key: "achievement", label: "Achievement %", render: (row) => `${row.achievement || 0}%`, minWidth: "90px", align: "right" },
    { key: "variance", label: "Remaining", render: (row) => formatMoney(row.variance), minWidth: "100px", align: "right" },
    ...(onDetails ? [{ key: "actions", label: "", render: (row) => (
      <button type="button" onClick={() => onDetails(row)} className="text-[11px] font-bold text-[#ff4b0b] hover:underline">Details</button>
    ), minWidth: "60px", sortable: false }] : []),
  ];
}

function departmentColumns() {
  return [
    { key: "department", label: "Department", minWidth: "120px" },
    { key: "target", label: "Target", render: (row) => formatMoney(row.target), minWidth: "100px", align: "right" },
    { key: "achieved", label: "Achievement", render: (row) => formatMoney(row.achieved), minWidth: "100px", align: "right" },
    { key: "achievement", label: "Achievement %", render: (row) => `${row.achievement || 0}%`, minWidth: "90px", align: "right" },
  ];
}

export function PoReport() {
  const router = useRouter();
  const report = useReport("/admin/reports/po", monthRange());
  const [period, setPeriod] = useState("Monthly");
  const summary = useMemo(() => report.data.summary || {}, [report.data.summary]);
  const managerRows = useMemo(() => report.data.managerRows || [], [report.data.managerRows]);
  const comparisonRows = useMemo(() => report.data.comparisonRows || [], [report.data.comparisonRows]);
  const purchaseOrders = useMemo(() => report.data.purchaseOrders || [], [report.data.purchaseOrders]);
  const [selectedPo, setSelectedPo] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  }, [loggingOut, router]);

  const currentUserName = currentUser?.name || currentUser?.email?.split("@")?.[0] || "Admin";

  const topbarChildren = useMemo(() => (
    <div className="grid w-full grid-cols-1 gap-2 min-[520px]:grid-cols-[48px_minmax(172px,auto)] min-[900px]:w-auto min-[900px]:grid-cols-[48px_auto]">
      <NotificationMenu count={notifications.length} items={notifications} />
      <UserMenu
        userName={currentUserName}
        userInitials={currentUserName.slice(0, 2).toUpperCase()}
        onDashboard={() => router.push("/dashboard")}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </div>
  ), [notifications, currentUserName, router, handleLogout, loggingOut]);

  const formatMoney = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };
  const getPoStatusColor = (po) => {
    const s = (po.activityStatus || po.trackingStatus || po.status || "").toLowerCase();
    if (s.includes("payment") || s.includes("completed")) return "bg-[#eefaf2] text-[#1f7a43]";
    if (s.includes("delay")) return "bg-[#fff2ed] text-[#cc4b37]";
    if (s.includes("approved") || s.includes("processed")) return "bg-[#f3f5ff] text-[#5a67d8]";
    return "bg-[#f3f0f3] text-[#1f2340]";
  };

  const exportRows = useMemo(() => managerRows.map((row) => [row.name, row.received, row.completed, row.delivered]), [managerRows]);

  return (
    <PageShell title="PO Reports" subtitle="View and analyze Purchase Order performance and status." topbarChildren={topbarChildren}>
      <ReportFilters period={period} setPeriod={setPeriod} options={report.data.options} filters={report.filters} setFilters={report.setFilters} fromDate={report.fromDate} toDate={report.toDate} setFromDate={report.setFromDate} setToDate={report.setToDate} onExport={(format) => {
        if (format === "csv") {
          const headerRow = ["PO No", "Company", "Vendor", "Value", "Date", "Category", "Expected Delivery", "Delivery Date", "Payment Received", "Status", "Activity Status", "Tracking Status", "Created By", "Approved By"];
          const rows = purchaseOrders.map((po) => [
            po.poNo || "-",
            po.companyName || "-",
            po.vendorName || "-",
            formatMoney(po.poValue),
            formatDate(po.poDate),
            po.category || "-",
            formatDate(po.expectedDeliveryDate),
            formatDate(po.deliveryDate),
            formatDate(po.paymentReceivedDate),
            po.status || "-",
            po.activityStatus || "-",
            po.trackingStatus || "-",
            po.createdBy?.name || "-",
            po.approvedBy?.name || "-",
          ]);
          exportCsv(`po-report-${report.fromDate}-to-${report.toDate}.csv`, [headerRow, ...rows]);
        }
        if (format === "pdf") exportPoPdf({ purchaseOrders, summary, filters: report.filters, fromDate: report.fromDate, toDate: report.toDate });
      }} />
      <div className="flex flex-wrap gap-3">
        <MetricCard icon={FileText} label="PO Received" value={formatNumber(summary.received)} note="Total POs" color="#1d86f5" />
        <MetricCard icon={CheckCircle2} label="PO Completed" value={formatNumber(summary.completed)} note="Total POs" color="#19b96d" />
        <MetricCard icon={FileSpreadsheet} label="PO Delivered" value={formatNumber(summary.delivered)} note="Total POs" color="#9a31ef" />
        <MetricCard icon={BarChart3} label="Delayed POs" value={formatNumber(summary.delayed)} note="Total POs" color="#f29322" />
        <MetricCard icon={TrendingUp} label="On Time Delivery" value={`${summary.onTimeDelivery || 0}%`} note="On time %" color="#10a7a7" />
      </div>
      <div className="mt-6">
        <Panel title={`All Purchase Orders (${purchaseOrders.length})`}>
          <Table
            columns={[
              { key: "poNo", label: "PO No", minWidth: "120px" },
              { key: "companyName", label: "Company", minWidth: "150px" },
              { key: "poValue", label: "Value", minWidth: "100px", align: "right", render: (po) => formatMoney(po.poValue) },
              { key: "poDate", label: "Date", minWidth: "100px", render: (po) => formatDate(po.poDate) },
              { key: "category", label: "Category", minWidth: "100px" },
              { key: "status", label: "Status", minWidth: "130px", render: (po) => (
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${getPoStatusColor(po)}`}>
                  {po.activityStatus || po.trackingStatus || po.status || "-"}
                </span>
              )},
              { key: "createdBy", label: "By", minWidth: "110px", render: (po) => po.createdBy?.name || "-" },
            ]}
            data={purchaseOrders}
            loading={false}
            pageSize={15}
            emptyText="No purchase orders found."
            onRowClick={(po) => setSelectedPo(po)}
          />
        </Panel>
      </div>

      <Modal open={!!selectedPo} title="PO Details" subtitle={selectedPo?.poNo || "-"} wide onClose={() => setSelectedPo(null)}>
        {selectedPo && (
          <>
            <div className="mb-4 flex items-center justify-end">
              <ExportDropdown onExport={(format) => {
                if (format === "csv") {
                  const headerRow = ["PO No", "Company", "Vendor", "Category", "PO Value", "PO Date", "Expected Delivery", "Delivery Date", "Payment Received", "Status", "Activity Status", "Tracking Status", "Created By", "Approved By", "Processed By", "Approval Remarks", "Processing Remarks", "Tracking Remarks", "Remarks"];
                  const row = [
                    selectedPo.poNo || "-", selectedPo.companyName || "-", selectedPo.vendorName || "-", selectedPo.category || "-", formatMoney(selectedPo.poValue), formatDate(selectedPo.poDate),
                    formatDate(selectedPo.expectedDeliveryDate), formatDate(selectedPo.deliveryDate), formatDate(selectedPo.paymentReceivedDate),
                    selectedPo.status || "-", selectedPo.activityStatus || "-", selectedPo.trackingStatus || "-",
                    selectedPo.createdBy?.name || "-", selectedPo.approvedBy?.name || "-", selectedPo.processedBy?.name || "-",
                    selectedPo.approvalRemarks || "", selectedPo.processingRemarks || "", selectedPo.trackingRemarks || "", selectedPo.remarks || "",
                  ];
                  const logHeaderRow = ["#", "Date", "Old Status", "New Status", "Remark", "Updated By", "Employee ID"];
                  const logRows = [...(selectedPo.statusLogs || [])].reverse().map((log, idx) => [
                    idx + 1, log.updatedAt ? formatDateTime(log.updatedAt) : "-", log.oldStatus || "-", log.newStatus || "-", log.remark || "-", log.updatedByName || log.updatedBy?.name || "-", log.updatedBy?.employeeId || "-",
                  ]);
                  exportCsv(`po-detail-${selectedPo.poNo || "po"}.csv`, [headerRow, row, [], logHeaderRow, ...logRows]);
                }
                if (format === "pdf") exportSinglePoDetailPdf(selectedPo);
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3 pb-4">
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">PO Number</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{selectedPo.poNo || "-"}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">PO Value</p>
              <p className="mt-1 text-sm font-bold text-[#2ea44f]">{formatMoney(selectedPo.poValue)}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">Company</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{selectedPo.companyName || "-"}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">Category</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{selectedPo.category || "-"}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">PO Date</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{formatDate(selectedPo.poDate)}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">Expected Delivery</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{formatDate(selectedPo.expectedDeliveryDate)}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">Status</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{selectedPo.activityStatus || selectedPo.trackingStatus || selectedPo.status || "-"}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">Created By</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{selectedPo.createdBy?.name || "-"}</p>
              <p className="text-[11px] font-medium text-[#7580a5]">{selectedPo.createdBy?.email || ""}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">Delivery Date</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{formatDate(selectedPo.deliveryDate)}</p>
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
              <p className="text-[10px] font-bold uppercase text-[#7580a5]">Payment Received</p>
              <p className="mt-1 text-sm font-bold text-[#071033]">{formatDate(selectedPo.paymentReceivedDate)}</p>
            </div>
            {(selectedPo.approvalRemarks || selectedPo.processingRemarks || selectedPo.trackingRemarks || selectedPo.remarks) && (
              <div className="col-span-2 rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
                <p className="text-[10px] font-bold uppercase text-[#7580a5]">Remarks</p>
                {selectedPo.approvalRemarks && <p className="mt-1 text-xs font-medium text-[#071033]">Approval: {selectedPo.approvalRemarks}</p>}
                {selectedPo.processingRemarks && <p className="mt-1 text-xs font-medium text-[#071033]">Processing: {selectedPo.processingRemarks}</p>}
                {selectedPo.trackingRemarks && <p className="mt-1 text-xs font-medium text-[#071033]">Tracking: {selectedPo.trackingRemarks}</p>}
                {selectedPo.remarks && <p className="mt-1 text-xs font-medium text-[#071033]">General: {selectedPo.remarks}</p>}
              </div>
            )}
          </div>

          {selectedPo.statusLogs && selectedPo.statusLogs.length > 0 && (
            <div className="border-t border-[#eef0f6] pt-4">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-[#ff4b0b]" />
                <p className="text-[11px] font-bold uppercase text-[#20285f]">Status Logs</p>
                <span className="rounded-full bg-[#f3f5ff] px-2 py-0.5 text-[10px] font-bold text-[#5a67d8]">{selectedPo.statusLogs.length}</span>
              </div>
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {[...selectedPo.statusLogs].reverse().map((log, idx) => (
                  <div key={idx} className="rounded-[8px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-[#fff2ed] px-2 py-0.5 text-[10px] font-bold text-[#cc4b37]">
                          {log.oldStatus || "-"}
                        </span>
                        <span className="text-[10px] text-[#7580a5]">→</span>
                        <span className="inline-flex items-center rounded-full bg-[#eefaf2] px-2 py-0.5 text-[10px] font-bold text-[#1f7a43]">
                          {log.newStatus || "-"}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-[#7580a5]">
                        {log.updatedAt ? formatDate(log.updatedAt) : "-"}
                      </span>
                    </div>
                    {log.remark && (
                      <p className="mt-1.5 text-[11px] font-medium text-[#071033]">{log.remark}</p>
                    )}
                    {log.updatedByName && (
                      <p className="mt-1 text-[10px] text-[#7580a5]">
                        By: {log.updatedByName}{log.updatedByRole ? ` (${log.updatedByRole})` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}
      </Modal>
    </PageShell>
  );
}

const formatCoords = (loc, mode = "activity") => {
  if (mode === "activity") {
    const lat = loc?.coordinates?.latitude;
    const lng = loc?.coordinates?.longitude;
    return lat != null ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : null;
  }
  const lat = loc?.lat;
  const lng = loc?.lng;
  return lat != null ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : null;
};

function getDayStatusLabel(activities, dateStr, workingHours) {
  const wh = workingHours || { startTime: "10:00", endTime: "18:00" };
  const [startH, startM] = wh.startTime.split(":").map(Number);
  const [endH, endM] = wh.endTime.split(":").map(Number);
  const dayActs = (activities || []).filter((act) => {
    if (!act.loginTime) return false;
    const d = new Date(act.loginTime);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return ds === dateStr;
  });
  if (!dayActs.length) return "Absent";
  const latest = dayActs[dayActs.length - 1];
  const login = new Date(latest.loginTime);
  const loginMins = login.getHours() * 60 + login.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  const hasLogout = !!latest.logoutTime;
  if (!hasLogout) return "Absent";
  const logout = new Date(latest.logoutTime);
  const logoutMins = logout.getHours() * 60 + logout.getMinutes();
  if (loginMins <= startMins) {
    if (logoutMins < endMins) return "Half Day";
    return "Present";
  }
  return "Late";
}

function computeAttendanceStats(employee, fromDate, toDate) {
  const activities = employee.activities || [];
  const workingHours = employee.workingHours;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  let workingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" });
    if (dayName === "Sunday") {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    workingDays++;
    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const status = getDayStatusLabel(activities, dateStr, workingHours);
    if (status === "Present") presentDays++;
    else if (status === "Absent") absentDays++;
    else if (status === "Late") lateDays++;
    else if (status === "Half Day") halfDays++;
    cursor.setDate(cursor.getDate() + 1);
  }
  const attendancePercent = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
  return { workingDays, presentDays, absentDays, lateDays, halfDays, attendancePercent };
}

export function AttendanceReport() {
  const today = new Date().toLocaleDateString("en-CA");
  const report = useReport("/admin/reports/attendance", { fromDate: today, toDate: today });
  const [selectedRow, setSelectedRow] = useState(null);
  const daily = useMemo(() => report.data.daily || [], [report.data.daily]);
  const safeUsers = useMemo(() => (report.data.options?.users || []), [report.data.options?.users]);
  const departmentRows = useMemo(() => (report.data.departmentRows || []), [report.data.departmentRows]);
  const employeeRows = useMemo(() => (report.data.employeeRows || []), [report.data.employeeRows]);

  const summary = useMemo(() => ({
    ...(report.data.summary || {}),
    totalEmployees: safeUsers.length,
  }), [report.data.summary, safeUsers]);

  const mergedEmployeeRows = useMemo(() => {
    const fd = report.fromDate;
    const td = report.toDate;
    return employeeRows.map((row) => {
      const stats = fd && td ? computeAttendanceStats(row, fd, td) : row;
      return { ...row, ...stats };
    });
  }, [employeeRows, report.fromDate, report.toDate]);

  const computedSummary = useMemo(() => {
    const totalPres = mergedEmployeeRows.reduce((s, r) => s + (r.presentDays || 0), 0);
    const totalAbs = mergedEmployeeRows.reduce((s, r) => s + ((r.absentDays || 0) + (r.partialDays || 0)), 0);
    const totalLate = mergedEmployeeRows.reduce((s, r) => s + (r.lateDays || 0), 0);
    const totalHalf = mergedEmployeeRows.reduce((s, r) => s + (r.halfDays || 0), 0);
    const totalWorkDays = mergedEmployeeRows.reduce((s, r) => s + (r.workingDays || 0), 0);
    const overallPct = totalWorkDays ? Number((((totalPres + totalLate + totalHalf * 0.5) / totalWorkDays) * 100).toFixed(2)) : 0;
    const presentEmployees = mergedEmployeeRows.filter((r) => (r.presentDays || 0) > 0).length;
    const absentEmployees = mergedEmployeeRows.filter((r) => ((r.absentDays || 0) + (r.partialDays || 0)) > 0).length;
    return { present: totalPres, absent: totalAbs, presentEmployees, absentEmployees, overallAttendance: overallPct };
  }, [mergedEmployeeRows]);

  const mergedSummary = useMemo(() => ({
    ...summary,
    ...computedSummary,
  }), [summary, computedSummary]);

  const onApply = useCallback(() => {}, []);

  const filteredDeptUsers = useMemo(() => {
    const all = safeUsers;
    if (report.filters.department && report.filters.department !== "all") {
      return all.filter((u) => u.department === report.filters.department);
    }
    return all;
  }, [safeUsers, report.filters.department]);

  const employeesOpts = useMemo(() => {
    const opts = [{ value: "all", label: "All Employees" }];
    filteredDeptUsers.forEach((u) => opts.push({ value: u._id, label: userName(u) }));
    return opts;
  }, [filteredDeptUsers]);

  const exportRows = useMemo(() => mergedEmployeeRows.map((row) => [row.name, row.department, row.presentDays, row.absentDays, row.lateDays, row.halfDays, row.attendancePercent, row.totalMeetings]), [mergedEmployeeRows]);

  return (
    <PageShell title="Attendance Report" subtitle="View and analyze attendance of all team members.">
      <Panel title="">
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePicker fromDate={report.fromDate} toDate={report.toDate} appliedFromDate={report.fromDate} appliedToDate={report.toDate} setFromDate={report.setFromDate} setToDate={report.setToDate} onApply={onApply} onReset={onApply} />
          <div className="flex min-w-[200px] flex-1 flex-wrap items-end gap-3">
            <SelectBox className="min-w-[140px] flex-1" value={report.filters.department} onChange={(v) => report.setFilters((p) => ({ ...p, department: v }))} options={[{ value: "all", label: "All Departments" }, ...(report.data.options?.departments || []).map((d) => ({ value: d, label: d }))]} />
            <SelectBox className="min-w-[140px] flex-1" value={report.filters.employee || "all"} onChange={(v) => report.setFilters((p) => ({ ...p, employee: v }))} options={employeesOpts} />
          </div>
          <div className="flex items-end gap-2">
            <ExportDropdown onExport={(format) => {
              if (format === "csv") {
                const headerRow = ["Employee Name", "Department", "Present", "Absent", "Late", "Half Day", "Attendance %", "Meetings"];
                exportCsv(`attendance-${report.fromDate}-to-${report.toDate}.csv`, [headerRow, ...exportRows]);
              }
              if (format === "pdf") exportAttendancePdf({
                employeeRows: mergedEmployeeRows,
                summary: mergedSummary,
                filters: report.filters,
                fromDate: report.fromDate,
                toDate: report.toDate,
              });
            }} />
          </div>
        </div>
      </Panel>
      <div className="flex flex-wrap gap-3">
        <MetricCard icon={Users} label="Total Employees" value={formatNumber(mergedSummary.totalEmployees)} note="All Team Members" color="#1d86f5" />
        <MetricCard icon={TrendingUp} label="Overall Attendance" value={`${mergedSummary.overallAttendance || 0}%`} note="Effective attendance" color="#ee3d83" />
        <MetricCard icon={CalendarDays} label="Total Meetings" value={formatNumber(mergedSummary.totalMeetings)} note="Conducted" color="#10a7a7" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Panel title="Attendance Overview"><BarChart data={daily} bars={[{ key: "present", color: "#35c46b" }, { key: "absent", color: "#ff5d2a" }, { key: "halfDay", color: "#ff9f1c" }]} maxValue={100} totalEmployees={mergedSummary.totalEmployees} /></Panel>
        <Panel title="Attendance by Department"><BarChart data={departmentRows.map((row) => ({ label: row.department, present: row.present, absent: (row.absent || 0) + (row.partial || 0) }))} bars={[{ key: "present", color: "#35c46b" }, { key: "absent", color: "#ff5d2a" }]} maxValue={100} /></Panel>
        <Panel title="Attendance Trend"><LineChart data={daily} lines={[{ key: "present", color: "#2f80ed" }, { key: "absent", color: "#a8b0c8" }]} totalEmployees={mergedSummary.totalEmployees} /></Panel>
      </div>
      <Panel title="Employee Attendance Summary">
        <Table columns={[
          { key: "name", label: "Employee Name", minWidth: "120px" },
          { key: "department", label: "Department", minWidth: "100px" },
          { key: "attendance", label: "Attendance", render: (row) => (
            <div className="space-y-1 text-[11px] font-bold">
              <p><span className="text-[#1f7a43]">Present:</span> {row.presentDays}</p>
              <p><span className="text-[#d1451e]">Absent:</span> {(row.absentDays || 0) + (row.partialDays || 0)}</p>
              <p><span className="text-[#8b2fd4]">Late:</span> {row.lateDays}</p>
              <p><span className="text-[#b7791f]">Half Day:</span> {row.halfDays}</p>
              <p><span className="text-[#1d6ff5]">Working Days:</span> {row.workingDays}</p>
            </div>
          ), minWidth: "160px" },
          { key: "totalMeetings", label: "Meetings", minWidth: "70px", align: "right" },
          { key: "attendancePercent", label: "Attendance %", render: (row) => `${row.attendancePercent || 0}%`, minWidth: "80px", align: "right" },
          { key: "actions", label: "", render: (row) => (
            <button type="button" onClick={() => setSelectedRow(row)} className="text-[11px] font-bold text-[#ff4b0b] hover:underline">Details</button>
          ), minWidth: "60px", sortable: false },
        ]} data={mergedEmployeeRows} />
      </Panel>

      <Modal open={!!selectedRow} onClose={() => setSelectedRow(null)} title={selectedRow?.name || ""} subtitle={`Department: ${selectedRow?.department || "-"}`} wide>
        <div className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-4 min-[380px]:px-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-[11px] font-bold text-[#1f7a43]">Present: {selectedRow?.presentDays}</span>
            <span className="rounded-full bg-[#ffeee8] px-3 py-1 text-[11px] font-bold text-[#d1451e]">Absent: {(selectedRow?.absentDays || 0) + (selectedRow?.partialDays || 0)}</span>
            <span className="rounded-full bg-[#f2ddff] px-3 py-1 text-[11px] font-bold text-[#8b2fd4]">Late: {selectedRow?.lateDays}</span>
            <span className="rounded-full bg-[#fff0dd] px-3 py-1 text-[11px] font-bold text-[#b7791f]">Half Day: {selectedRow?.halfDays}</span>
            <span className="rounded-full bg-[#e4f1ff] px-3 py-1 text-[11px] font-bold text-[#1d6ff5]">Meetings: {selectedRow?.totalMeetings}</span>
            <div className="ml-auto">
              <ExportDropdown onExport={(format) => {
                if (format === "csv") {
                  const name = selectedRow?.name || "-";
                  const dept = selectedRow?.department || "-";
                  const headerRow = ["Employee Name", "Department", "Section", "Date", "Login Time", "Logout Time", "Day Status", "Login Location", "Login Coords", "Logout Location", "Logout Coords", "Meeting Title", "Meeting Type", "Start Time", "End Time", "Duration", "Start Location", "Start Coords", "End Location", "End Coords"];
                  const activityRows = (selectedRow?.activities || []).map((act) => {
                    const hasLogout = !!act.logoutTime;
                    const loginHr = act.loginTime ? new Date(act.loginTime).getHours() : 0;
                    let dayStatus = "Absent";
                    if (act.loginTime && hasLogout) {
                      if (loginHr < 10 && new Date(act.logoutTime).getHours() < 18) dayStatus = "Half Day";
                      else if (loginHr >= 10) dayStatus = "Late";
                      else dayStatus = "Present";
                    } else if (act.loginTime && !hasLogout) {
                      dayStatus = "Absent";
                    }
                    return [name, dept, "Activity", formatDate(act.loginTime), formatDateTime(act.loginTime), act.logoutTime ? formatDateTime(act.logoutTime) : "-", dayStatus, act.loginLocation?.name || "-", formatCoords(act.loginLocation, "activity") || "-", act.logoutLocation?.name || "-", formatCoords(act.logoutLocation, "activity") || "-", "", "", "", "", "", "", "", "", ""];
                  });
                  const meetingRows = (selectedRow?.meetings || []).map((m) => {
                    const dur = m.startTime && m.endTime ? Math.round((new Date(m.endTime) - new Date(m.startTime)) / 60000) : null;
                    const durStr = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "-";
                    return [name, dept, "Meeting", formatDate(m.startTime), "", "", "", "", "", "", "", m.title || "-", m.meetingType || "-", formatDateTime(m.startTime), m.endTime ? formatDateTime(m.endTime) : "-", durStr, m.startLocation?.name || m.startLocation || "-", formatCoords(m.startLocation) || "-", m.endLocation?.name || m.endLocation || "-", formatCoords(m.endLocation) || "-"];
                  });
                  const allRows = [...activityRows, ...meetingRows];
                  exportCsv(`attendance-detail-${name.replace(/[^a-z0-9]+/gi, "-")}-${report.fromDate}-to-${report.toDate}.csv`, [headerRow, ...allRows]);
                }
                if (format === "pdf") exportAttendancePdf({
                  employeeRows: [selectedRow],
                  summary: {
                    ...mergedSummary,
                    totalEmployees: 1,
                    present: selectedRow?.presentDays || 0,
                    absent: (selectedRow?.absentDays || 0) + (selectedRow?.partialDays || 0),
                    overallAttendance: selectedRow?.attendancePercent || 0,
                  },
                  filters: { ...report.filters, employee: selectedRow?.id || "selected" },
                  fromDate: report.fromDate,
                  toDate: report.toDate,
                });
              }} />
            </div>
          </div>

          <p className="mb-2 text-[13px] font-bold text-[#0a0c60]">Login / Logout Activity</p>
          {selectedRow?.activities?.length > 0 ? (
            <div className="mb-5 overflow-x-auto">
              <table className="w-full min-w-[650px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#eef0f6] bg-white">
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Date</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Login Time</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Logout Time</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Status</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Login Location</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Login Coords</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Logout Location</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Logout Coords</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.activities.map((act, idx) => {
                    const hasLogout = !!act.logoutTime;
                    const loginHr = act.loginTime ? new Date(act.loginTime).getHours() : 0;
                    let dayStatus = "Absent";
                    if (act.loginTime && hasLogout) {
                      if (loginHr < 10 && new Date(act.logoutTime).getHours() < 18) dayStatus = "Half Day";
                      else if (loginHr >= 10) dayStatus = "Late";
                      else dayStatus = "Present";
                    } else if (act.loginTime && !hasLogout) {
                      dayStatus = "Absent";
                    }
                    const statusColor = dayStatus === "Present" ? "bg-[#eefaf2] text-[#1f7a43]" : dayStatus === "Late" ? "bg-[#f2ddff] text-[#8b2fd4]" : dayStatus === "Half Day" ? "bg-[#fff0dd] text-[#b7791f]" : "bg-[#ffeee8] text-[#d1451e]";
                    return (
                      <tr key={idx} className="border-b border-[#eef0f6]">
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{formatDate(act.loginTime)}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{formatDateTime(act.loginTime)}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{act.logoutTime ? formatDateTime(act.logoutTime) : "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold">
                          <span className={`rounded-full px-2 py-0.5 ${statusColor}`}>{dayStatus}</span>
                        </td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{act.loginLocation?.name || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#6b74a0]">{formatCoords(act.loginLocation, "activity") || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{act.logoutLocation?.name || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#6b74a0]">{formatCoords(act.logoutLocation, "activity") || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mb-5 text-[11px] font-bold text-[#7a83a8]">No activity data available.</p>
          )}

          {selectedRow?.meetings?.length > 0 && (
            <>
              <p className="mb-2 text-[13px] font-bold text-[#0a0c60]">Meetings ({selectedRow.totalMeetings})</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#eef0f6] bg-white">
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Title</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Date</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Type</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Start → End</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Start Location</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Start Coords</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">End Location</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">End Coords</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRow.meetings.map((m, idx) => (
                      <tr key={idx} className="border-b border-[#eef0f6]">
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{m.title}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{formatDate(m.startTime)}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{m.meetingType || m.status || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{formatDateTime(m.startTime)} → {formatDateTime(m.endTime)}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{m.startLocation?.name || m.location || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#6b74a0]">{formatCoords(m.startLocation, "meeting") || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{m.endLocation?.name || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#6b74a0]">{formatCoords(m.endLocation, "meeting") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {(!selectedRow?.meetings || selectedRow.meetings.length === 0) && (
            <p className="text-[11px] font-bold text-[#7a83a8]">No meeting data for this period.</p>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}

export function LoginLogoutReport() {
  const today = new Date().toLocaleDateString("en-CA");
  const report = useReport("/admin/reports/login-logout", { fromDate: today, toDate: today });
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const isPerUser = report.filters.employee && report.filters.employee !== "all";

  const [otherTab, setOtherTab] = useState("activities");
  const [otherData, setOtherData] = useState({ activities: [], meetings: [], meetingReports: [] });
  const [openExportTab, setOpenExportTab] = useState(null);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setOpenExportTab(null); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchOther = useCallback(async () => {
    const params = { fromDate: report.fromDate, toDate: report.toDate };
    if (report.filters.department && report.filters.department !== "all") params.department = report.filters.department;
    if (isPerUser) params.employee = report.filters.employee;
    const response = await api.get("/admin/reports/other", { params });
    setOtherData(response.data || {});
  }, [report.fromDate, report.toDate, isPerUser, report.filters.employee, report.filters.department]);

  useEffect(() => {
    fetchOther().catch((error) => console.error("Other reports fetch error:", error));
  }, [fetchOther]);

  const safeUsers = useMemo(() => (report.data.options?.users || []), [report.data.options?.users]);
  const safeUserRows = useMemo(() => (report.data.userRows || []), [report.data.userRows]);
  const safeDeptRows = useMemo(() => (report.data.departmentRows || []), [report.data.departmentRows]);

  const meetingsRows = useMemo(() => {
    const raw = otherData.meetings || [];
    const groups = {};
    const singles = [];

    for (const m of raw) {
      if (m.leadId) {
        if (!groups[m.leadId]) groups[m.leadId] = [];
        groups[m.leadId].push(m);
      } else {
        singles.push(m);
      }
    }

    const rows = [];
    for (const [leadId, items] of Object.entries(groups)) {
      items.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      items.forEach((m, i) => {
        rows.push({ ...m, _showLead: i === 0, _leadId: leadId, _groupCount: items.length });
      });
    }

    singles.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    return [...rows, ...singles];
  }, [otherData.meetings]);

  const meetingReportsRows = useMemo(() => {
    const raw = otherData.meetingReports || [];
    const groups = {};
    const singles = [];

    for (const m of raw) {
      if (m.leadId) {
        if (!groups[m.leadId]) groups[m.leadId] = [];
        groups[m.leadId].push(m);
      } else {
        singles.push(m);
      }
    }

    const rows = [];
    for (const [leadId, items] of Object.entries(groups)) {
      items.sort((a, b) => new Date(b.meetingDateTime) - new Date(a.meetingDateTime));
      items.forEach((m, i) => {
        rows.push({ ...m, _showLead: i === 0, _leadId: leadId, _groupCount: items.length });
      });
    }

    singles.sort((a, b) => new Date(b.meetingDateTime) - new Date(a.meetingDateTime));
    return [...rows, ...singles];
  }, [otherData.meetingReports]);

  const memberLogouts = useMemo(() => safeUserRows.filter((r) => r.totalLogouts > 0).length, [safeUserRows]);
  const activeUserCount = useMemo(
    () => safeUserRows.filter((r) => {
      const active = r.activities?.filter((a) => !a.logoutTime);
      return active && active.length > 0;
    }).length,
    [safeUserRows]
  );
  const summary = useMemo(() => {
    const logins = safeUserRows.length;
    const logouts = memberLogouts;
    return {
      ...(report.data.summary || {}),
      memberLogins: logins,
      totalLogouts: logouts,
      activeUsers: activeUserCount,
      loginSuccessRate: logins ? ((logouts / logins) * 100).toFixed(2) : 0,
    };
  }, [report.data.summary, safeUserRows, memberLogouts, activeUserCount]);

  const filteredUsers = useMemo(() => {
    const all = safeUsers;
    if (report.filters.department && report.filters.department !== "all") {
      return all.filter((u) => u.department === report.filters.department);
    }
    return all;
  }, [safeUsers, report.filters.department]);

  const userOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Users" }];
    filteredUsers.forEach((u) => opts.push({ value: u._id, label: userName(u) }));
    return opts;
  }, [filteredUsers]);

  const groupedActivities = useMemo(() => {
    const filtered = (otherData.activities || []);
    const map = {};
    filtered.forEach((a) => {
      const key = a.user?._id || a.user;
      if (!map[key]) map[key] = { user: a.user, department: a.user?.department || "-", entries: [] };
      map[key].entries.push(a);
    });
    return Object.values(map);
  }, [otherData.activities]);

  const formatTime = (value) =>
    value
      ? new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
      : "-";

  const md = selectedMeeting?.meeting || selectedMeeting;

  return (
    <PageShell title="Login / Logout Report" subtitle="Track and analyze login & logout activities across teams and departments.">
      <Panel title="">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker fromDate={report.fromDate} toDate={report.toDate} appliedFromDate={report.fromDate} appliedToDate={report.toDate} setFromDate={report.setFromDate} setToDate={report.setToDate} onApply={() => {}} onReset={() => {}} />
          <SelectBox className="min-w-[100px]" value={report.filters.department} onChange={(v) => { report.setFilters((p) => ({ ...p, department: v, employee: "all" })); }} options={[{ value: "all", label: "All Departments" }, ...(report.data.options?.departments || []).map((d) => ({ value: d, label: d }))]} />
          <SelectBox className="min-w-[100px]" value={report.filters.employee || "all"} onChange={(v) => report.setFilters((p) => ({ ...p, employee: v }))} options={userOptions} />
          <div className="flex items-center gap-2">
          </div>
        </div>
      </Panel>
      <div className="flex flex-wrap gap-3">
        <MetricCard icon={LogIn} label="Total Member Logins" value={formatNumber(summary.memberLogins)} note="Selected range" color="#1d86f5" />
        <MetricCard icon={LogOut} label="Total Logouts" value={formatNumber(summary.totalLogouts)} note="Selected range" color="#19b96d" />
        {!isPerUser && <MetricCard icon={Users} label="Active Users" value={formatNumber(summary.activeUsers)} note="Unique users" color="#f29322" />}
        <MetricCard icon={CheckCircle2} label="Login Success Rate" value={`${summary.loginSuccessRate || 0}%`} note="Logout matched logins" color="#10a7a7" />
      </div>
      <Panel title="All Activities & Reports">
        <div className="flex gap-2 border-b border-[#eef0f6] overflow-x-auto">
          <button onClick={() => setOtherTab("activities")} className={`whitespace-nowrap px-4 py-3 text-[12px] font-bold transition ${otherTab === "activities" ? "border-b-2 border-[#ff4b0b] text-[#ff4b0b]" : "text-[#6270a2]"}`}>Activities</button>
          <button onClick={() => setOtherTab("meetings")} className={`whitespace-nowrap px-4 py-3 text-[12px] font-bold transition ${otherTab === "meetings" ? "border-b-2 border-[#ff4b0b] text-[#ff4b0b]" : "text-[#6270a2]"}`}>Meetings</button>
          <button onClick={() => setOtherTab("reports")} className={`whitespace-nowrap px-4 py-3 text-[12px] font-bold transition ${otherTab === "reports" ? "border-b-2 border-[#ff4b0b] text-[#ff4b0b]" : "text-[#6270a2]"}`}>Meeting Reports</button>
        </div>
        <div ref={exportRef} className="min-w-0 overflow-x-auto pt-4">
          {otherTab === "activities" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6270a2]">{groupedActivities.length} user(s)</span>
                <div className="relative flex gap-2">
                  <button type="button" onClick={() => setOpenExportTab(openExportTab === "activities" ? null : "activities")} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[10px] font-bold text-[#20285f] hover:border-[#ffb396] transition">
                    <Download className="h-3 w-3" />
                    Export
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {openExportTab === "activities" && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-[140px] overflow-hidden rounded-[8px] border border-[#e7e9f1] bg-white shadow-lg">
                      <button type="button" onClick={() => {
                        const rows = [["User", "Department", "Designation", "Login Time", "Login Location", "Login Coords", "Logout Time", "Logout Location", "Logout Coords", "Duration", "Device"]];
                        groupedActivities.forEach((g) => { g.entries.forEach((e) => {
                          const dur = e.loginTime && e.logoutTime ? Math.round((new Date(e.logoutTime) - new Date(e.loginTime)) / 60000) : null;
                          const durStr = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "-";
                          rows.push([userName(g.user), g.department || "-", formatRole(g.user || {}), formatDateTime(e.loginTime), e.loginLocation?.name || "-", formatCoords(e.loginLocation, "activity") || "-", e.logoutTime ? formatDateTime(e.logoutTime) : "-", e.logoutLocation?.name || "-", formatCoords(e.logoutLocation, "activity") || "-", durStr, g.user?.deviceInfo?.device || g.user?.device || "-"]);
                        }); });
                        exportCsv(`activities-${report.fromDate}-to-${report.toDate}.csv`, rows);
                        setOpenExportTab(null);
                      }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#20285f] hover:bg-[#f8f9fb] transition">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-[#19b96d]" /> CSV
                      </button>
                      <button type="button" onClick={() => {
                        exportLoginLogoutPdf({ summary: report.data.summary, departmentRows: safeDeptRows, userRows: safeUserRows, loginDistribution: report.data.loginDistribution, deviceRows: report.data.deviceRows, locationRows: report.data.locationRows, filters: report.filters, fromDate: report.fromDate, toDate: report.toDate });
                        setOpenExportTab(null);
                      }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#20285f] hover:bg-[#f8f9fb] transition">
                        <FileText className="h-3.5 w-3.5 text-[#ff4b0b]" /> PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            <Table columns={[
              { key: "user", label: "User", render: (row) => <div><p className="truncate text-[11px] font-bold text-[#0a0c60]">{userName(row.user)}</p><p className="truncate text-[9px] font-medium text-[#68729d]">{formatRole(row.user || {})}</p></div>, minWidth: "140px" },
              { key: "department", label: "Department", render: (row) => row.department, minWidth: "100px" },
              { key: "loginTime", label: "Login Time", render: (row) => <div className="space-y-1">{row.entries.map((e, i) => <span key={i} className="block text-[11px] font-bold text-[#2b356f]">{formatDateTime(e.loginTime)}</span>)}</div>, minWidth: "130px" },
              { key: "loginLocation", label: "Login Location", render: (row) => <div className="space-y-1">{row.entries.map((e, i) => <span key={i} className="block text-[11px] font-bold text-[#2b356f]">{e.loginLocation?.name || "-"}</span>)}</div>, minWidth: "130px" },
              { key: "logoutTime", label: "Logout Time", render: (row) => <div className="space-y-1">{row.entries.map((e, i) => <span key={i} className="block text-[11px] font-bold text-[#2b356f]">{e.logoutTime ? formatDateTime(e.logoutTime) : "-"}</span>)}</div>, minWidth: "130px" },
              { key: "logoutLocation", label: "Logout Location", render: (row) => <div className="space-y-1">{row.entries.map((e, i) => <span key={i} className="block text-[11px] font-bold text-[#2b356f]">{e.logoutLocation?.name || "-"}</span>)}</div>, minWidth: "130px" },
            ]} data={groupedActivities} paginated={false} sortable={false} />
            </div>
          )}
          {otherTab === "meetings" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6270a2]">{meetingsRows.length} meeting(s)</span>
                <div className="relative flex gap-2">
                  <button type="button" onClick={() => setOpenExportTab(openExportTab === "meetings" ? null : "meetings")} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[10px] font-bold text-[#20285f] hover:border-[#ffb396] transition">
                    <Download className="h-3 w-3" />
                    Export
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {openExportTab === "meetings" && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-[140px] overflow-hidden rounded-[8px] border border-[#e7e9f1] bg-white shadow-lg">
                      <button type="button" onClick={() => {
                        const rows = [["Lead", "Meeting Title", "Type", "Date & Time", "End Time", "Duration", "Start Location", "Start Coords", "End Location", "End Coords", "Created By", "Meeting Type", "Status"]];
                        (otherData.meetings || []).forEach((m) => {
                          const dur = m.startTime && m.endTime ? Math.round((new Date(m.endTime) - new Date(m.startTime)) / 60000) : null;
                          const durStr = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "-";
                          rows.push([m.leadId || "-", m.title || "-", m.isFollowUp ? "F/U" : "New", formatDateTime(m.startTime), m.endTime ? formatDateTime(m.endTime) : "-", durStr, m.startLocation?.name || m.location || "-", formatCoords(m.startLocation) || "-", m.endLocation?.name || "-", formatCoords(m.endLocation) || "-", userName(m.createdBy), m.meetingType === "team" ? "Team" : "Client", m.status || "-"]);
                        });
                        exportCsv(`meetings-${report.fromDate}-to-${report.toDate}.csv`, rows);
                        setOpenExportTab(null);
                      }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#20285f] hover:bg-[#f8f9fb] transition">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-[#19b96d]" /> CSV
                      </button>
                      <button type="button" onClick={() => {
                        exportMeetingsPdf({ meetings: otherData.meetings || [], filters: report.filters, fromDate: report.fromDate, toDate: report.toDate });
                        setOpenExportTab(null);
                      }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#20285f] hover:bg-[#f8f9fb] transition">
                        <FileText className="h-3.5 w-3.5 text-[#ff4b0b]" /> PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            <Table columns={[
              { key: "lead", label: "Lead", render: (row) => (
                row._showLead ? (
                  <div>
                    <span className="text-[11px] font-bold text-[#0a0c60]">{row._leadId}</span>
                    <p className="mt-1 text-[9px] font-medium text-[#68729d]">{row._groupCount} meetings</p>
                  </div>
                ) : (
                  <span className="text-[11px] text-[#7a83a8]">{row.leadId || "-"}</span>
                )
              ), minWidth: "100px" },
              { key: "title", label: "Meeting", render: (row) => (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#0a0c60]">{row.title}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${row.isFollowUp ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-600"}`}>
                    {row.isFollowUp ? "F/U" : "New"}
                  </span>
                </div>
              ), minWidth: "160px" },
              { key: "schedule", label: "Date & Location", render: (row) => (
                <div>
                  <p className="text-[11px] font-bold text-[#2b356f]">{formatDateTime(row.startTime)}</p>
                  {row.startLocation?.name && <p className="text-[9px] font-medium text-[#68729d]">Start: {row.startLocation.name}</p>}
                  {row.endLocation?.name && <p className="text-[9px] font-medium text-[#68729d]">End: {row.endLocation.name}</p>}
                  {!row.startLocation?.name && row.location && <p className="text-[9px] font-medium text-[#68729d]">{row.location}</p>}
                </div>
              ), minWidth: "160px" },
              { key: "createdBy", label: "By", render: (row) => (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#2b356f]">{userName(row.createdBy)}</span>
                  <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold bg-blue-50 text-blue-600">{row.meetingType === "team" ? "Team" : "Client"}</span>
                </div>
              ), minWidth: "90px" },
              { key: "status", label: "Status", render: (row) => (
                <div>
                  <p className="text-[11px] font-semibold text-[#2b356f]">{row.status}</p>
                  <p className={`mt-0.5 text-[9px] font-medium ${row.hasReport ? "text-green-500" : "text-[#b1b6cc]"}`}>
                    {row.hasReport ? "Report added" : "No report"}
                  </p>
                </div>
              ), minWidth: "70px" },
              { key: "actions", label: "", render: (row) => (
                <button type="button" onClick={() => setSelectedMeeting(row)} className="text-[11px] font-bold text-[#ff4b0b] hover:underline">Details</button>
              ), minWidth: "50px", sortable: false },
            ]} data={meetingsRows} paginated={false} sortable={false} />
            </div>
          )}
          {otherTab === "reports" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6270a2]">{meetingReportsRows.length} report(s)</span>
                <div className="relative flex gap-2">
                  <button type="button" onClick={() => setOpenExportTab(openExportTab === "reports" ? null : "reports")} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[10px] font-bold text-[#20285f] hover:border-[#ffb396] transition">
                    <Download className="h-3 w-3" />
                    Export
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {openExportTab === "reports" && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-[140px] overflow-hidden rounded-[8px] border border-[#e7e9f1] bg-white shadow-lg">
                      <button type="button" onClick={() => {
                        const rows = [["Lead", "Meeting Title", "Type", "Date & Time", "Location", "Created By", "Report Type", "Lead Status", "Deal Value", "Company", "Purpose", "Notes"]];
                        (otherData.meetingReports || []).forEach((r) => { rows.push([r.leadId || "-", r.meeting?.title || "N/A", r.meeting?.isFollowUp !== undefined ? (r.meeting.isFollowUp ? "F/U" : "New") : "-", formatDateTime(r.meetingDateTime), r.meeting?.startLocation?.name || r.meeting?.location || "-", userName(r.createdBy), r.reportType === "team" ? "Team" : "Client", r.leadStatus || "Submitted", formatMoney(r.expectedDealValue || 0), r.companyName || r.company || "-", r.meetingPurpose || "-", r.notes || "-"]); });
                        exportCsv(`meeting-reports-${report.fromDate}-to-${report.toDate}.csv`, rows);
                        setOpenExportTab(null);
                      }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#20285f] hover:bg-[#f8f9fb] transition">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-[#19b96d]" /> CSV
                      </button>
                      <button type="button" onClick={() => {
                        exportMeetingReportsPdf({ reports: otherData.meetingReports || [], filters: report.filters, fromDate: report.fromDate, toDate: report.toDate });
                        setOpenExportTab(null);
                      }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#20285f] hover:bg-[#f8f9fb] transition">
                        <FileText className="h-3.5 w-3.5 text-[#ff4b0b]" /> PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            <Table columns={[
              { key: "lead", label: "Lead", render: (row) => (
                row._showLead ? (
                  <div>
                    <span className="text-[11px] font-bold text-[#0a0c60]">{row._leadId}</span>
                    <p className="mt-1 text-[9px] font-medium text-[#68729d]">{row._groupCount} reports</p>
                  </div>
                ) : (
                  <span className="text-[11px] text-[#7a83a8]">{row.leadId || "-"}</span>
                )
              ), minWidth: "100px" },
              { key: "title", label: "Meeting", render: (row) => (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#0a0c60]">{row.meeting?.title || "N/A"}</span>
                  {row.meeting?.isFollowUp !== undefined && (
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${row.meeting?.isFollowUp ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-600"}`}>
                      {row.meeting?.isFollowUp ? "F/U" : "New"}
                    </span>
                  )}
                </div>
              ), minWidth: "160px" },
              { key: "schedule", label: "Date & Location", render: (row) => (
                <div>
                  <p className="text-[11px] font-bold text-[#2b356f]">{formatDateTime(row.meetingDateTime)}</p>
                  {row.meeting?.startLocation?.name && <p className="text-[9px] font-medium text-[#68729d]">Start: {row.meeting.startLocation.name}</p>}
                  {row.meeting?.endLocation?.name && <p className="text-[9px] font-medium text-[#68729d]">End: {row.meeting.endLocation.name}</p>}
                  {!row.meeting?.startLocation?.name && row.meeting?.location && <p className="text-[9px] font-medium text-[#68729d]">{row.meeting.location}</p>}
                </div>
              ), minWidth: "160px" },
              { key: "createdBy", label: "By", render: (row) => (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#2b356f]">{userName(row.createdBy)}</span>
                  <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold bg-blue-50 text-blue-600">{row.reportType === "team" ? "Team" : "Client"}</span>
                </div>
              ), minWidth: "90px" },
              { key: "status", label: "Status", render: (row) => (
                <div>
                  <p className="text-[11px] font-semibold text-[#2b356f]">{row.leadStatus || "Submitted"}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-green-500">Report submitted</p>
                </div>
              ), minWidth: "90px" },
              { key: "dealValue", label: "Deal Value", render: (row) => (
                <span className="text-[11px] font-semibold text-[#2b356f]">{formatMoney(row.expectedDealValue || 0)}</span>
              ), minWidth: "90px", align: "right" },
              { key: "actions", label: "", render: (row) => (
                <button type="button" onClick={() => setSelectedMeeting(row)} className="text-[11px] font-bold text-[#ff4b0b] hover:underline">Details</button>
              ), minWidth: "50px", sortable: false },
            ]} data={meetingReportsRows} paginated={false} sortable={false} />
            </div>
          )}
        </div>
      </Panel>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {!isPerUser && <Panel title="Team Members Login/Logout Comparison">
          <Table columns={[
            { key: "name", label: "Team Member", render: (row) => <div><p className="truncate text-[11px] font-bold text-[#0a0c60]">{row.name || "-"}</p><p className="truncate text-[9px] font-medium text-[#68729d]">{formatRole(row)}</p></div>, minWidth: "140px" },
            { key: "totalLogins", label: "Total Logins", minWidth: "80px", align: "right" },
            { key: "totalLogouts", label: "Total Logouts", minWidth: "80px", align: "right" },
            { key: "actions", label: "", render: (row) => (
              <button type="button" onClick={() => setSelectedRow(row)} className="text-[11px] font-bold text-[#ff4b0b] hover:underline">Details</button>
            ), minWidth: "60px", sortable: false },
          ]} data={safeUserRows} paginated={false} sortable={false} />
        </Panel>}
        {!isPerUser && <Panel title="Department Login/Logout Comparison">
          <Table columns={[
            { key: "department", label: "Department", minWidth: "120px" },
            { key: "totalLogins", label: "Total Logins", minWidth: "80px", align: "right" },
            { key: "totalLogouts", label: "Total Logouts", minWidth: "80px", align: "right" },
            { key: "activeUsers", label: "Active Users", minWidth: "80px", align: "right" },
          ]} data={safeDeptRows} paginated={false} sortable={false} />
        </Panel>}
      </div>

      <Modal open={!!selectedRow} onClose={() => setSelectedRow(null)} title={selectedRow?.name || ""} subtitle={`Department: ${selectedRow?.department || "-"}`} wide>
        <div className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-4 min-[380px]:px-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#e4f1ff] px-3 py-1 text-[11px] font-bold text-[#1d6ff5]">Logins: {selectedRow?.totalLogins}</span>
            <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-[11px] font-bold text-[#1f7a43]">Logouts: {selectedRow?.totalLogouts}</span>
            <div className="ml-auto">
              <ExportDropdown onExport={(format) => {
                if (format === "csv") {
                  const headerRow = ["#", "Login Time", "Logout Time", "Duration", "Login Location", "Login Coords", "Logout Location", "Logout Coords"];
                  const rows = (selectedRow?.activities || []).map((act, idx) => {
                    const dur = act.loginTime && act.logoutTime ? Math.round((new Date(act.logoutTime) - new Date(act.loginTime)) / 60000) : null;
                    const durStr = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "-";
                    return [idx + 1, formatDateTime(act.loginTime), act.logoutTime ? formatDateTime(act.logoutTime) : "-", durStr, act.loginLocation?.name || "-", formatCoords(act.loginLocation, "activity") || "-", act.logoutLocation?.name || "-", formatCoords(act.logoutLocation, "activity") || "-"];
                  });
                  exportCsv(`activity-${selectedRow?.name || "user"}-${report.fromDate}-to-${report.toDate}.csv`, [headerRow, ...rows]);
                }
                if (format === "pdf") exportLoginLogoutPdf({
                  userRows: [selectedRow],
                  departmentRows: [],
                  summary: {},
                  filters: { ...report.filters, employee: selectedRow?.id || "selected" },
                  fromDate: report.fromDate,
                  toDate: report.toDate,
                });
              }} />
            </div>
          </div>

          <p className="mb-2 text-[13px] font-bold text-[#0a0c60]">Activity Log with GPS Locations</p>
          {selectedRow?.activities?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#eef0f6] bg-white">
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">#</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Login Time</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Logout Time</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Duration</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Login Location</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Login Coords</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Logout Location</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Logout Coords</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.activities.map((act, idx) => {
                    const dur = act.loginTime && act.logoutTime
                      ? Math.round((new Date(act.logoutTime) - new Date(act.loginTime)) / 60000)
                      : null;
                    const durStr = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "-";
                    return (
                      <tr key={idx} className="border-b border-[#eef0f6]">
                        <td className="px-3 py-2 text-[11px] font-bold text-[#6b74a0]">{idx + 1}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{formatDateTime(act.loginTime)}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{act.logoutTime ? formatDateTime(act.logoutTime) : "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{durStr}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{act.loginLocation?.name || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#6b74a0]">{formatCoords(act.loginLocation, "activity") || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{act.logoutLocation?.name || "-"}</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#6b74a0]">{formatCoords(act.logoutLocation, "activity") || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[11px] font-bold text-[#7a83a8]">No activity data available.</p>
          )}
        </div>
      </Modal>

      <Modal open={!!selectedMeeting} onClose={() => setSelectedMeeting(null)} title={md?.title || "Details"} subtitle={`${selectedMeeting?.reportType ? "Report" : "Meeting"} by: ${userName(selectedMeeting?.createdBy)}`} wide>
        <div className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-4 min-[380px]:px-5">
          <div className="mb-4 flex justify-end">
            <ExportDropdown onExport={(format) => {
              if (format === "csv") {
                if (selectedMeeting?.reportType) {
                  const headerRow = ["Meeting", "Date & Time", "Type", "Report Type", "Lead Status", "Deal Value", "Company", "Contact", "Designation", "Lead ID", "Created By", "Purpose", "Notes", "Status", "Start Time", "End Time", "Location", "Start Location", "Start Coords", "End Location", "End Coords", "Attendees"];
                  const dur = md?.startTime && md?.endTime ? Math.round((new Date(md.endTime) - new Date(md.startTime)) / 60000) : null;
                  const durStr = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "-";
                  const attendees = (md?.attendees || []).map((a) => typeof a === "string" ? a : a.email).join("; ");
                  const row = [
                    selectedMeeting?.meetingTitle || md?.title || "-", formatDateTime(selectedMeeting?.meetingDateTime || md?.startTime),
                    selectedMeeting?.meetingType || md?.meetingType || "-", selectedMeeting?.reportType || "-", selectedMeeting?.leadStatus || "-", formatMoney(selectedMeeting?.expectedDealValue || 0),
                    selectedMeeting?.companyName || md?.companyName || "-", selectedMeeting?.contactPerson || md?.personName || "-", md?.designation || "-", selectedMeeting?.leadId || "-",
                    selectedMeeting?.createdBy?.name || userName(md?.createdBy) || "-", selectedMeeting?.meetingPurpose || "-", selectedMeeting?.notes || "-",
                    md?.status || "-", formatDateTime(md?.startTime), formatDateTime(md?.endTime), md?.startLocation?.name || md?.location || "-",
                    md?.startLocation?.name || "-", formatCoords(md?.startLocation) || "-", md?.endLocation?.name || "-", formatCoords(md?.endLocation) || "-", attendees || "-",
                  ];
                  exportCsv(`meeting-report-detail-${(selectedMeeting?.leadId || "report").replace(/[^a-z0-9]+/gi, "-")}.csv`, [headerRow, row]);
                } else {
                  const headerRow = ["Title", "Person Name", "Designation", "Company", "Start Time", "End Time", "Duration", "Location", "Description", "Created By", "Status", "Meeting Type", "Is Follow-up", "Start Location", "Start Coords", "End Location", "End Coords", "Attendees"];
                  const dur = md?.startTime && md?.endTime ? Math.round((new Date(md.endTime) - new Date(md.startTime)) / 60000) : null;
                  const durStr = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "-";
                  const attendees = (md?.attendees || []).map((a) => typeof a === "string" ? a : a.email).join("; ");
                  const row = [
                    md?.title || "-", md?.personName || "-", md?.designation || "-", md?.companyName || "-", formatDateTime(md?.startTime), formatDateTime(md?.endTime), durStr,
                    md?.startLocation?.name || md?.location || "-", md?.description || "-", userName(md?.createdBy) || userName(selectedMeeting?.createdBy) || "-",
                    md?.status || "-", md?.meetingType === "team" ? "Team" : "Client", md?.isFollowUp ? "Yes" : "No",
                    md?.startLocation?.name || "-", formatCoords(md?.startLocation) || "-", md?.endLocation?.name || "-", formatCoords(md?.endLocation) || "-", attendees || "-",
                  ];
                  exportCsv(`meeting-${(md?.title || "meeting").replace(/[^a-z0-9]+/gi, "-")}.csv`, [headerRow, row]);
                }
              }
              if (format === "pdf") {
                if (selectedMeeting?.reportType) {
                  exportMeetingReportsPdf({ reports: [selectedMeeting], filters: report.filters, fromDate: report.fromDate, toDate: report.toDate });
                } else {
                  exportMeetingsPdf({ meetings: [selectedMeeting], filters: report.filters, fromDate: report.fromDate, toDate: report.toDate });
                }
              }
            }} />
          </div>
          {/* ---------- Meeting Details ---------- */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${md?.isFollowUp ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-600"}`}>
              {md?.isFollowUp ? "Follow-up Meeting" : "New Meeting"}
            </span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${md?.meetingType === "team" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
              {md?.meetingType === "team" ? "Team Meeting" : "Client Meeting"}
            </span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              md?.status === "completed" ? "bg-green-50 text-green-600" :
              md?.status === "upcoming" ? "bg-blue-50 text-blue-600" :
              md?.status === "ongoing" ? "bg-amber-50 text-amber-600" :
              "bg-red-50 text-red-600"
            }`}>
              {md?.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold text-[#7a83a8]">Meeting Title</p>
              <p className="text-[13px] font-semibold text-[#071033]">{md?.title || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#7a83a8]">Person Name</p>
              <p className="text-[13px] font-semibold text-[#071033]">{md?.personName || "-"}</p>
            </div>
            {md?.designation && (
              <div>
                <p className="text-[10px] font-bold text-[#7a83a8]">Designation</p>
                <p className="text-[13px] font-semibold text-[#071033]">{md.designation}</p>
              </div>
            )}
            {md?.companyName && (
              <div>
                <p className="text-[10px] font-bold text-[#7a83a8]">Company</p>
                <p className="text-[13px] font-semibold text-[#071033]">{md.companyName}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-[#7a83a8]">Start Time</p>
              <p className="text-[13px] font-semibold text-[#071033]">{formatDateTime(md?.startTime)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#7a83a8]">End Time</p>
              <p className="text-[13px] font-semibold text-[#071033]">{formatDateTime(md?.endTime)}</p>
            </div>
            {md?.location && (
              <div>
                <p className="text-[10px] font-bold text-[#7a83a8]">Location</p>
                <p className="text-[13px] font-semibold text-[#071033]">{md.location}</p>
              </div>
            )}
            {md?.description && (
              <div className="sm:col-span-2">
                <p className="text-[10px] font-bold text-[#7a83a8]">Description</p>
                <p className="text-[13px] font-semibold text-[#071033]">{md.description}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-[#7a83a8]">Created By</p>
              <p className="text-[13px] font-semibold text-[#071033]">{userName(md?.createdBy) || userName(selectedMeeting?.createdBy) || "-"}</p>
            </div>
          </div>

          {(md?.startLocation || md?.endLocation) && (
            <>
              <p className="mb-2 mt-4 text-[12px] font-bold text-[#0a0c60]">Meeting Locations</p>
              <div className="overflow-x-auto rounded-lg border border-[#eef0f6]">
                <table className="w-full min-w-[300px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#eef0f6] bg-[#fafbfe]">
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Type</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-[#16205f]">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {md?.startLocation && (
                      <tr className="border-b border-[#eef0f6]">
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">Start</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{md.startLocation?.name || md.location || "-"}</td>
                      </tr>
                    )}
                    {md?.endLocation && (
                      <tr>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">End</td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#2b356f]">{md.endLocation?.name || "-"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {md?.attendees?.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-[12px] font-bold text-[#0a0c60]">Attendees ({md.attendees.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {md.attendees.map((att, idx) => (
                  <span key={idx} className="rounded-full bg-[#f2f4ff] px-2.5 py-1 text-[10px] font-semibold text-[#3d4f9a]">
                    {typeof att === "string" ? att : att.email}
                  </span>
                ))}
              </div>
            </>
          )}

          {md?.isFollowUp && (
            <>
              <p className="mb-2 mt-4 text-[12px] font-bold text-[#0a0c60]">Follow-up Info</p>
              <div className="grid gap-3 rounded-lg border border-[#eef0f6] bg-[#fafbfe] p-3 sm:grid-cols-2">
                {md?.leadId && (
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">Lead ID</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{md.leadId}</p>
                  </div>
                )}
                {md?.followUpRemark && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold text-[#7a83a8]">Follow-up Remark</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{md.followUpRemark}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {md?.cancellationRemark && (
            <>
              <p className="mb-2 mt-4 text-[12px] font-bold text-[#0a0c60]">Cancellation Remark</p>
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-[13px] font-semibold text-[#c0392b]">{md.cancellationRemark}</p>
              </div>
            </>
          )}

          {/* ---------- Meeting Report Details ---------- */}
          {selectedMeeting?.reportType && (
            <>
              <hr className="my-5 border-[#eef0f6]" />
              <p className="mb-3 text-[13px] font-bold text-[#0a0c60]">Meeting Report Details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold text-[#7a83a8]">Report Type</p>
                  <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.reportType === "team" ? "Team" : "Client"}</p>
                </div>
                {selectedMeeting.meetingPurpose && (
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">Meeting Purpose</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.meetingPurpose}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-[#7a83a8]">Meeting Date</p>
                  <p className="text-[13px] font-semibold text-[#071033]">{formatDateTime(selectedMeeting.meetingDateTime)}</p>
                </div>
                {selectedMeeting.reportType !== "team" && <>
                  {selectedMeeting.companyName && (
                    <div>
                      <p className="text-[10px] font-bold text-[#7a83a8]">Company Name</p>
                      <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.companyName}</p>
                    </div>
                  )}
                  {selectedMeeting.contactPerson && (
                    <div>
                      <p className="text-[10px] font-bold text-[#7a83a8]">Contact Person</p>
                      <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.contactPerson}</p>
                    </div>
                  )}
                  {selectedMeeting.phoneNumber && (
                    <div>
                      <p className="text-[10px] font-bold text-[#7a83a8]">Phone Number</p>
                      <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.phoneNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">Lead Status</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      selectedMeeting.leadStatus === "hot" ? "bg-red-50 text-red-600" :
                      selectedMeeting.leadStatus === "warm" ? "bg-amber-50 text-amber-600" :
                      selectedMeeting.leadStatus === "cold" ? "bg-blue-50 text-blue-600" :
                      selectedMeeting.leadStatus === "converted" ? "bg-green-50 text-green-600" :
                      selectedMeeting.leadStatus === "lead_closed" ? "bg-gray-50 text-gray-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>{selectedMeeting.leadStatus || "pending"}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">Expected Deal Value</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{formatMoney(selectedMeeting.expectedDealValue || 0)}</p>
                  </div>
                  {selectedMeeting.leadId && (
                    <div>
                      <p className="text-[10px] font-bold text-[#7a83a8]">Lead ID</p>
                      <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.leadId}</p>
                    </div>
                  )}
                  {selectedMeeting.poReceived !== undefined && (
                    <div>
                      <p className="text-[10px] font-bold text-[#7a83a8]">PO Received</p>
                      <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.poReceived ? "Yes" : "No"}</p>
                    </div>
                  )}
                  {selectedMeeting.purchaseOrderNumber && (
                    <div>
                      <p className="text-[10px] font-bold text-[#7a83a8]">PO Number</p>
                      <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.purchaseOrderNumber}</p>
                    </div>
                  )}
                </>}
                {selectedMeeting.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold text-[#7a83a8]">Notes</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.notes}</p>
                  </div>
                )}
                {selectedMeeting.meetingPoints && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold text-[#7a83a8]">Meeting Points</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.meetingPoints}</p>
                  </div>
                )}
                {selectedMeeting.category && (
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">Category</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.category}</p>
                  </div>
                )}
                {selectedMeeting.paymentTerms && (
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">Payment Terms</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{selectedMeeting.paymentTerms}</p>
                  </div>
                )}
                {selectedMeeting.poDate && (
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">PO Date</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{formatDateTime(selectedMeeting.poDate)}</p>
                  </div>
                )}
                {selectedMeeting.poExpectedDeliveryDate && (
                  <div>
                    <p className="text-[10px] font-bold text-[#7a83a8]">Expected Delivery</p>
                    <p className="text-[13px] font-semibold text-[#071033]">{formatDateTime(selectedMeeting.poExpectedDeliveryDate)}</p>
                  </div>
                )}
                {selectedMeeting.leadClosedRemark && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold text-[#7a83a8]">Lead Closed Remark</p>
                    <p className="text-[13px] font-semibold text-[#c0392b]">{selectedMeeting.leadClosedRemark}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}

export function MeetingAnalyticsReport() {
  const router = useRouter();
  const report = useReport("/admin/reports/meetings", monthRange());
  const [period, setPeriod] = useState("Monthly");
  const summary = report.data.summary || {};
  const leadRows = useMemo(() => {
    const rows = report.data.leadRows || [];
    return [...rows].sort((a, b) => {
      const dA = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0;
      const dB = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0;
      return dB - dA;
    });
  }, [report.data.leadRows]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  }, [loggingOut, router]);

  const currentUserName = currentUser?.name || currentUser?.email?.split("@")?.[0] || "Admin";

  const topbarChildren = useMemo(() => (
    <div className="grid w-full grid-cols-1 gap-2 min-[520px]:grid-cols-[48px_minmax(172px,auto)] min-[900px]:w-auto min-[900px]:grid-cols-[48px_auto]">
      <NotificationMenu count={notifications.length} items={notifications} />
      <UserMenu
        userName={currentUserName}
        userInitials={currentUserName.slice(0, 2).toUpperCase()}
        onDashboard={() => router.push("/dashboard")}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </div>
  ), [notifications, currentUserName, router, handleLogout, loggingOut]);

  return (
    <PageShell title="Meeting Reports" subtitle="View and analyze meetings across teams and departments." topbarChildren={topbarChildren}>
      <span className="contents">
        <ReportFilters includeDaily={false} period={period} setPeriod={setPeriod} options={report.data.options} filters={report.filters} setFilters={report.setFilters} fromDate={report.fromDate} toDate={report.toDate} setFromDate={report.setFromDate} setToDate={report.setToDate} showExport={false} />
      </span>
      <div className="flex flex-wrap gap-3 mt-4">
        <MetricCard icon={CalendarDays} label="Total Meetings" value={formatNumber(summary.totalMeetings)} note="Selected range" color="#1d86f5" />
        <MetricCard icon={Users} label="Team Meetings" value={formatNumber(summary.teamMeetings)} note="Internal" color="#19b96d" />
        <MetricCard icon={UserCheck} label="Client Meetings" value={formatNumber(summary.clientMeetings)} note="Client meetings" color="#9a31ef" />
        <MetricCard icon={Timer} label="Total Hours" value={summary.totalMeetingHours || "0h 0m"} note="Selected range" color="#f29322" />
        <MetricCard icon={BarChart3} label="Avg. Duration" value={summary.avgMeetingDuration || "0h 0m"} note="Per meeting" color="#10a7a7" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Panel title="Team & Client Meetings (Monthly)">
          <BarChart data={report.data.monthly || []} bars={[{ key: "team", color: "#2f80ed" }, { key: "client", color: "#35c46b" }]} />
        </Panel>
        <Panel title="Meeting Completion Trend (Monthly)">
          <LineChart data={report.data.monthly || []} lines={[{ key: "completed", color: "#19b96d" }, { key: "cancelled", color: "#ee3d83" }]} />
        </Panel>
        <Panel title="Department Wise Meetings">
          <DonutList total={formatNumber(summary.totalMeetings)} centerLabel="Total Meetings" rows={(report.data.departmentRows || []).map((row) => ({ label: row.department, count: row.meetings, share: row.share }))} />
        </Panel>
      </div>
      <Panel title="Meetings by Department">
        <Table columns={[{ key: "team", label: "Department", minWidth: "120px" }, { key: "teamMeetings", label: "Team", minWidth: "60px", align: "right" }, { key: "clientMeetings", label: "Client", minWidth: "60px", align: "right" }, { key: "totalMeetings", label: "Total", minWidth: "60px", align: "right" }, { key: "totalHours", label: "Hours", minWidth: "80px" }, { key: "avgDuration", label: "Avg.", minWidth: "80px" }]} data={report.data.teamRows || []} paginated={false} sortable={false} />
      </Panel>
      <Panel title="Meetings by Employee">
        <Table columns={[{ key: "name", label: "Employee", minWidth: "120px" }, { key: "teamMeetings", label: "Team", minWidth: "60px", align: "right" }, { key: "clientMeetings", label: "Client", minWidth: "60px", align: "right" }, { key: "totalMeetings", label: "Total", minWidth: "60px", align: "right" }, { key: "totalHours", label: "Hours", minWidth: "80px" }, { key: "avgDuration", label: "Avg.", minWidth: "80px" }]} data={report.data.employeeRows || []} paginated={false} sortable={false} />
      </Panel>
      <Panel title="Meeting Status">
        <DonutList total={formatNumber(summary.totalMeetings)} centerLabel="Total Meetings" rows={(report.data.statusRows || []).map((row) => ({ label: row.label, count: row.count, share: row.share }))} colors={["#f29322", "#19b96d", "#ee3d83"]} />
      </Panel>
      <Panel title="Leads (Meeting-wise)" action={
        <ExportDropdown hideCsv={false} onExport={(format) => {
          if (format === "csv") {
            const headerRow = ["Lead ID", "Company", "Contact Person", "Email", "Phone", "Original Meeting", "Status", "Follow-ups", "Lead Status", "Deal Value", "Last Activity"];
            const rows = leadRows.map((row) => [
              row.leadId || "-",
              row.companyName || "-",
              row.contactPerson || "-",
              row.email || "-",
              row.phoneNumber || "-",
              row.originalMeetingTitle || "-",
              row.status || "-",
              String(row.followUpCount || 0),
              row.latestLeadStatus || "-",
              formatMoney(row.latestDealValue || 0),
              formatDate(row.latestActivityAt),
            ]);
            exportCsv(`meeting-leads-${report.fromDate}-to-${report.toDate}.csv`, [headerRow, ...rows]);
          }
          if (format === "pdf") exportMeetingLeadsPdf({ leadRows, filters: report.filters, fromDate: report.fromDate, toDate: report.toDate });
        }} />
      }>
        <Table columns={[
          { key: "leadId", label: "Lead / Date", minWidth: "130px", render: (row) => (
            <div>
              <p className="truncate text-[12px] font-bold text-[#071033]">{row.leadId || "-"}</p>
              <p className="truncate text-[10px] font-bold text-[#ff4b0b]">{formatDate(row.latestActivityAt)}</p>
            </div>
          )},
          { key: "companyName", label: "Company / Contact", minWidth: "150px", render: (row) => (
            <div>
              <p className="truncate text-[12px] font-bold text-[#071033]">{row.companyName || "-"}</p>
              <p className="truncate text-[10px] font-medium text-[#7580a5]">{row.contactPerson || "-"}</p>
            </div>
          )},
          { key: "originalMeetingTitle", label: "Original Meeting", minWidth: "140px" },
          { key: "status", label: "Status", render: (row) => (
            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${
              row.status === "converted" ? "bg-green-100 text-green-700" :
              row.status === "closed" ? "bg-red-100 text-red-700" :
              "bg-blue-100 text-blue-700"
            }`}>{row.status}</span>
          ), minWidth: "90px" },
          { key: "followUpCount", label: "Follow-ups / Status", minWidth: "110px", render: (row) => (
            <div>
              <p className="text-[12px] font-bold text-[#071033]">{row.followUpCount || 0} follow-ups</p>
              <p className="truncate text-[10px] font-medium text-[#7580a5]">{row.latestLeadStatus || "-"}</p>
            </div>
          )},
          { key: "actions", label: "", render: (row) => (
            <button type="button" onClick={() => setSelectedLead(row)} className="text-[11px] font-bold text-[#ff4b0b] hover:underline">Details</button>
          ), minWidth: "60px", sortable: false },
        ]} data={leadRows} sortable={false} paginated={false} />
      </Panel>
      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={selectedLead?.companyName || "Lead Details"} subtitle={`${selectedLead?.leadId || ""} — ${selectedLead?.contactPerson || ""}`} wide>
        {selectedLead && (
          <div className="space-y-5 overflow-y-auto p-5">
            <div className="flex items-center justify-end">
              <ExportDropdown onExport={(format) => {
                if (format === "csv") {
                  const headerRow = ["Lead ID", "Company", "Contact Person", "Phone", "Email", "Designation", "Status", "Lead Status", "Deal Value", "Follow-ups", "Last Activity", "Original Meeting", "Meeting Date", "Meeting Location"];
                  const row = [
                    selectedLead?.leadId || "-", selectedLead?.companyName || "-", selectedLead?.contactPerson || "-", selectedLead?.phoneNumber || "-", selectedLead?.email || "-", selectedLead?.designation || "-", selectedLead?.status || "-", selectedLead?.latestLeadStatus || "-", formatMoney(selectedLead?.latestDealValue || 0), selectedLead?.followUpCount || 0, formatDateTime(selectedLead?.latestActivityAt),
                    selectedLead?.originalMeetingTitle || "-", formatDateTime(selectedLead?.originalMeetingDate), selectedLead?.originalMeetingLocation || "-",
                  ];
                  exportCsv(`lead-detail-${selectedLead?.leadId || "lead"}.csv`, [headerRow, row]);
                }
                if (format === "pdf") exportLeadDetailPdf(selectedLead);
              }} />
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
              <h4 className="mb-3 text-[13px] font-extrabold text-[#071033]">Lead Information</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Lead ID</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.leadId || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Company</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.companyName || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Contact Person</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.contactPerson || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Phone</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.phoneNumber || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Email</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.email || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Designation</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.designation || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Status</span>
                  <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-[11px] font-bold capitalize ${
                    selectedLead.status === "converted" ? "bg-[#eefaf2] text-[#1f7a43]" :
                    selectedLead.status === "closed" ? "bg-[#fff2ed] text-[#cc4b37]" :
                    "bg-[#f3f5ff] text-[#5a67d8]"
                  }`}>{selectedLead.status || "-"}</span>
                </div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Latest Status</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.latestLeadStatus || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Deal Value</span><span className="mt-1 block text-[13px] font-bold text-[#2ea44f]">{formatMoney(selectedLead.latestDealValue || 0)}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Follow-ups</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.followUpCount || 0}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Last Activity</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{formatDateTime(selectedLead.latestActivityAt)}</span></div>
              </div>
            </div>

            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
              <h4 className="mb-3 text-[13px] font-extrabold text-[#071033]">Original Meeting</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Meeting Title</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.originalMeetingTitle || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Date</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{formatDateTime(selectedLead.originalMeetingDate)}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Location</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedLead.originalMeetingLocation || "-"}</span></div>
              </div>
            </div>

            {(selectedLead.followUpMeetings || []).length > 0 && (
              <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
                <h4 className="mb-3 text-[13px] font-extrabold text-[#071033]">Follow-up Meetings ({selectedLead.followUpCount})</h4>
                <Table columns={[
                  { key: "title", label: "Meeting", minWidth: "140px" },
                  { key: "startTime", label: "Date & Time", render: (row) => formatDateTime(row.startTime), minWidth: "140px" },
                  { key: "status", label: "Status", minWidth: "80px" },
                  { key: "meetingType", label: "Type", render: (row) => row.meetingType === "team" ? "Team" : "Client", minWidth: "70px" },
                  { key: "createdBy", label: "By", minWidth: "100px" },
                ]} data={selectedLead.followUpMeetings || []} paginated={false} sortable={false} mobileCard={false} />
              </div>
            )}

            {(selectedLead.reports || []).length > 0 && (
              <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
                <h4 className="mb-3 text-[13px] font-extrabold text-[#071033]">Meeting Reports ({selectedLead.reports.length})</h4>
                <Table columns={[
                  { key: "meetingTitle", label: "Meeting", minWidth: "140px" },
                  { key: "reportType", label: "Type", minWidth: "70px", render: (row) => row.reportType === "client" ? "Client" : "Team" },
                  { key: "leadStatus", label: "Lead Status", minWidth: "100px" },
                  { key: "expectedDealValue", label: "Deal Value", render: (row) => formatMoney(row.expectedDealValue || 0), minWidth: "90px", align: "right" },
                  { key: "meetingPurpose", label: "Purpose", minWidth: "120px" },
                  { key: "createdBy", label: "By", minWidth: "100px" },
                  { key: "actions", label: "", render: (row) => (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedReport(row); }} className="text-[11px] font-bold text-[#ff4b0b] hover:underline">View</button>
                  ), minWidth: "60px", sortable: false },
                ]} data={selectedLead.reports || []} paginated={false} sortable={false} mobileCard={false} />
              </div>
            )}

            {(selectedLead.followUpMeetings || []).length === 0 && (selectedLead.reports || []).length === 0 && (
              <p className="py-6 text-center text-[13px] font-semibold text-[#7a83a8]">No follow-up meetings or reports for this lead.</p>
            )}
          </div>
        )}
      </Modal>
      <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title="Meeting Report" subtitle={`${selectedReport?.meetingTitle || "-"} — Lead: ${selectedLead?.leadId || "N/A"}`} wide>
        {selectedReport && (
          <div className="space-y-5 overflow-y-auto p-5">
            <div className="flex items-center justify-end">
              <ExportDropdown onExport={(format) => {
                if (format === "csv") {
                  const headerRow = ["Lead ID", "Type", "Submitted By", "Meeting Date", "Meeting Purpose", "Lead Status", "Expected Deal", "Company", "Phone", "Category", "Payment Terms", "PO Received", "PO Number", "Discussion Points", "Notes"];
                  const row = [
                    selectedLead?.leadId || "-", selectedReport?.reportType || "-", selectedReport?.createdBy || "-", formatDateTime(selectedReport?.meetingDate), selectedReport?.meetingPurpose || "-", selectedReport?.leadStatus || "-", formatMoney(selectedReport?.expectedDealValue || 0), selectedReport?.companyName || "-", selectedReport?.phoneNumber || "-", selectedReport?.category || "-", selectedReport?.paymentTerms || "-", selectedReport?.poReceived ? "Yes" : "No", selectedReport?.purchaseOrderNumber || "-", selectedReport?.meetingPoints || "-", selectedReport?.notes || "-",
                  ];
                  exportCsv(`meeting-report-detail-${selectedLead?.leadId || "report"}.csv`, [headerRow, row]);
                }
                if (format === "pdf") exportMeetingReportDetailPdf(selectedReport);
              }} />
            </div>
            <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
              <h4 className="mb-3 text-[13px] font-extrabold text-[#071033]">Report Overview</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Lead ID</span><span className="mt-1 block text-[13px] font-bold text-[#ff4b0b]">{selectedLead?.leadId || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Type</span><span className="mt-1 block text-[13px] font-bold capitalize text-[#071033]">{selectedReport.reportType || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Submitted By</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.createdBy || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Meeting Date</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{formatDateTime(selectedReport.meetingDate)}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Meeting Purpose</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.meetingPurpose || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Lead Status</span><span className="mt-1 block text-[13px] font-bold capitalize text-[#071033]">{selectedReport.leadStatus || "-"}</span></div>
                <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Expected Deal</span><span className="mt-1 block text-[13px] font-bold text-[#2ea44f]">{formatMoney(selectedReport.expectedDealValue || 0)}</span></div>
              </div>
            </div>

            {selectedReport.reportType === "client" && (
              <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
                <h4 className="mb-3 text-[13px] font-extrabold text-[#071033]">Client Details</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Company</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.companyName || "-"}</span></div>
                  <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Phone</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.phoneNumber || "-"}</span></div>
                  <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Category</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.category || "-"}</span></div>
                  <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">Payment Terms</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.paymentTerms || "-"}</span></div>
                  <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">PO Received</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.poReceived ? "Yes" : "No"}</span></div>
                  <div><span className="block text-[10px] font-bold uppercase text-[#7580a5]">PO Number</span><span className="mt-1 block text-[13px] font-bold text-[#071033]">{selectedReport.purchaseOrderNumber || "-"}</span></div>
                </div>
              </div>
            )}

            {(selectedReport.meetingPoints && selectedReport.meetingPoints !== "-") && (
              <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
                <h4 className="mb-2 text-[13px] font-extrabold text-[#071033]">Discussion Points</h4>
                <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[#071033]">{selectedReport.meetingPoints}</p>
              </div>
            )}

            {(selectedReport.notes && selectedReport.notes !== "-") && (
              <div className="rounded-[12px] border border-[#eef0f6] bg-[#fbfbfd] p-4">
                <h4 className="mb-2 text-[13px] font-extrabold text-[#071033]">Notes</h4>
                <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[#071033]">{selectedReport.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

export function SimpleReport({ type, title, subtitle }) {
  const router = useRouter();
  const report = useReport(`/admin/reports/${type}`, monthRange());
  const [tab, setTab] = useState("activities");
  const activities = report.data.activities || [];
  const meetings = report.data.meetings || [];
  const meetingReports = report.data.meetingReports || [];

  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  }, [loggingOut, router]);

  const currentUserName = currentUser?.name || currentUser?.email?.split("@")?.[0] || "Admin";

  const topbarChildren = useMemo(() => (
    <div className="grid w-full grid-cols-1 gap-2 min-[520px]:grid-cols-[48px_minmax(172px,auto)] min-[900px]:w-auto min-[900px]:grid-cols-[48px_auto]">
      <NotificationMenu count={notifications.length} items={notifications} />
      <UserMenu
        userName={currentUserName}
        userInitials={currentUserName.slice(0, 2).toUpperCase()}
        onDashboard={() => router.push("/dashboard")}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </div>
  ), [notifications, currentUserName, router, handleLogout, loggingOut]);

  return (
    <PageShell title={title} subtitle={subtitle} topbarChildren={topbarChildren}>
      <span className="contents">
        <ReportFilters includeDaily={false} period="Monthly" setPeriod={() => {}} options={report.data.options} filters={report.filters} setFilters={report.setFilters} fromDate={report.fromDate} toDate={report.toDate} setFromDate={report.setFromDate} setToDate={report.setToDate} showExport={false} />
      </span>
      <div className="flex flex-wrap gap-3">
        <MetricCard icon={Users} label="Total Activities" value={formatNumber(activities.length)} note="Login/logout" color="#1d86f5" />
        <MetricCard icon={CalendarDays} label="Total Meetings" value={formatNumber(meetings.length)} note="Scheduled" color="#f29322" />
        <MetricCard icon={FileText} label="Meeting Reports" value={formatNumber(meetingReports.length)} note="Submitted" color="#9a31ef" />
      </div>
      <div className="flex gap-2 border-b border-[#eef0f6]">
        <button onClick={() => setTab("activities")} className={`px-4 py-3 text-[12px] font-bold transition ${tab === "activities" ? "border-b-2 border-[#ff4b0b] text-[#ff4b0b]" : "text-[#6270a2]"}`}>Activities</button>
        <button onClick={() => setTab("meetings")} className={`px-4 py-3 text-[12px] font-bold transition ${tab === "meetings" ? "border-b-2 border-[#ff4b0b] text-[#ff4b0b]" : "text-[#6270a2]"}`}>Meetings</button>
        <button onClick={() => setTab("reports")} className={`px-4 py-3 text-[12px] font-bold transition ${tab === "reports" ? "border-b-2 border-[#ff4b0b] text-[#ff4b0b]" : "text-[#6270a2]"}`}>Meeting Reports</button>
      </div>
      <div className="min-w-0 overflow-x-auto">
        {tab === "activities" && (
          <Table columns={[
            { key: "user", label: "User", render: (row) => <div><p className="truncate text-[11px] font-bold text-[#0a0c60]">{userName(row.user)}</p><p className="truncate text-[9px] font-medium text-[#68729d]">{formatRole(row.user || {})}</p></div>, minWidth: "140px" },
            { key: "department", label: "Department", render: (row) => row.user?.department || "-", minWidth: "100px" },
            { key: "loginTime", label: "Login Time", render: (row) => formatDateTime(row.loginTime), minWidth: "130px" },
            { key: "logoutTime", label: "Logout Time", render: (row) => formatDateTime(row.logoutTime), minWidth: "130px" },
            { key: "loginLocation", label: "Login Location", render: (row) => row.loginLocation?.name || "-", minWidth: "130px" },
            { key: "logoutLocation", label: "Logout Location", render: (row) => row.logoutLocation?.name || "-", minWidth: "130px" },
          ]} data={activities} paginated={false} sortable={false} />
        )}
        {tab === "meetings" && (
          <Table columns={[
            { key: "title", label: "Meeting Title", minWidth: "160px" },
            { key: "createdBy", label: "Scheduled By", render: (row) => userName(row.createdBy), minWidth: "120px" },
            { key: "startTime", label: "Date & Time", render: (row) => formatDateTime(row.startTime), minWidth: "140px" },
            { key: "status", label: "Status", minWidth: "90px" },
            { key: "approvalStatus", label: "Confirmation", minWidth: "100px" },
          ]} data={meetings} paginated={false} sortable={false} />
        )}
        {tab === "reports" && (
          <Table columns={[
            { key: "meeting", label: "Meeting", render: (row) => row.meeting?.title || "N/A", minWidth: "160px" },
            { key: "reportType", label: "Type", render: (row) => row.reportType === "client" ? "Client" : "Team", minWidth: "70px" },
            { key: "createdBy", label: "Submitted By", render: (row) => userName(row.createdBy), minWidth: "120px" },
            { key: "meetingDateTime", label: "Date", render: (row) => formatDateTime(row.meetingDateTime), minWidth: "140px" },
            { key: "leadStatus", label: "Lead Status", render: (row) => row.leadStatus || "-", minWidth: "100px" },
            { key: "expectedDealValue", label: "Deal Value", render: (row) => formatMoney(row.expectedDealValue || 0), minWidth: "100px", align: "right" },
          ]} data={meetingReports} paginated={false} sortable={false} />
        )}
      </div>
    </PageShell>
  );
}
