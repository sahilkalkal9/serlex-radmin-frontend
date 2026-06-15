import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ──────────────────────────────────────────────────────────────
   LOGIN LOGOUT PDF EXPORT
   - No cover page
   - Header: left logo, right report name + filters
   - Individual report: Name - Login Logout Activity
   - Safe page breaks
   - Wrapped table text
   - No overflow outside PDF
────────────────────────────────────────────────────────────── */

const C = {
  navy: "#0F172A",
  navy2: "#111827",
  slate: "#334155",
  text: "#1F2937",
  muted: "#64748B",
  soft: "#94A3B8",
  border: "#E2E8F0",
  border2: "#CBD5E1",
  bg: "#F8FAFC",
  bg2: "#F1F5F9",
  white: "#FFFFFF",
  amber: "#F59E0B",
  amberSoft: "#FEF3C7",
  green: "#16A34A",
  red: "#DC2626",
};

const PAGE = {
  marginX: 14,
  top: 26,
  bottom: 16,
};

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const safeText = (v, fallback = "-") => {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
};

const fn = (v) =>
  new Intl.NumberFormat("en-IN").format(Math.round(Number(v || 0)));

const fd = (v) => {
  if (!v) return "-";

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const fdt = (v) => {
  if (!v) return "-";

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const durationText = (loginTime, logoutTime) => {
  if (!loginTime) return "-";
  if (!logoutTime) return "Active";

  const a = new Date(loginTime);
  const b = new Date(logoutTime);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "-";

  const minutes = Math.max(0, Math.round((b - a) / 60000));

  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return `${minutes}m`;
};

const normalizeFilterValue = (v) => {
  if (v === null || v === undefined || v === "") return "all";
  return String(v).toLowerCase();
};

const getActivities = (user) => {
  if (!user) return [];
  return Array.isArray(user.activities) ? user.activities : [];
};

const getUserTotalLogins = (user) => {
  const provided = Number(user?.totalLogins || 0);
  if (provided > 0) return provided;

  return getActivities(user).filter((act) => act?.loginTime).length;
};

const getUserTotalLogouts = (user) => {
  const provided = Number(user?.totalLogouts || 0);
  if (provided > 0) return provided;

  return getActivities(user).filter((act) => act?.logoutTime).length;
};

const getUsersWithSessions = (userRows = []) =>
  (userRows || []).filter((user) => getActivities(user).length);

const isIndividualReport = (filters = {}, usersWithSessions = []) => {
  const employee = normalizeFilterValue(filters?.employee);
  const employeeId = normalizeFilterValue(filters?.employeeId);
  const user = normalizeFilterValue(filters?.user);
  const userId = normalizeFilterValue(filters?.userId);

  return (
    employee !== "all" ||
    employeeId !== "all" ||
    user !== "all" ||
    userId !== "all" ||
    usersWithSessions.length === 1
  );
};

function reportFileName(fromDate, toDate, meta = {}) {
  const prefix = meta?.isIndividual
    ? safeText(meta?.employee, "user")
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
    : "login-logout-activity";

  return `${prefix}-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(
    toDate
  ).replaceAll(" ", "-")}.pdf`;
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not available"));
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.92),
          width: canvas.width,
          height: canvas.height,
        });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("Logo failed to load"));
    img.src = src;
  });
}

function filterText({ fromDate, toDate, filters, usersWithSessions }) {
  const individual = isIndividualReport(filters, usersWithSessions);
  const selectedUser = individual ? usersWithSessions?.[0] : null;

  const employee =
    selectedUser?.name ||
    selectedUser?.fullName ||
    selectedUser?.employeeName ||
    (filters?.employee && filters.employee !== "all" ? filters.employee : null) ||
    "All Employees";

  const department =
    selectedUser?.department ||
    selectedUser?.departmentName ||
    selectedUser?.dept ||
    (filters?.department && filters.department !== "all"
      ? filters.department
      : "All Departments");

  const title = individual
    ? `${safeText(employee, "User")} - Login Logout Activity`
    : "Login Logout Activity Report";

  return {
    period: `${fd(fromDate)} — ${fd(toDate)}`,
    department,
    employee,
    title,
    isIndividual: individual,
  };
}

function addHeader(doc, meta = {}, logo = null) {
  const pw = doc.internal.pageSize.width;

  doc.setFillColor(...hex(C.white));
  doc.rect(0, 0, pw, 22, "F");

  doc.setDrawColor(...hex(C.border));
  doc.setLineWidth(0.25);
  doc.line(PAGE.marginX, 22, pw - PAGE.marginX, 22);

  if (logo?.dataUrl) {
    const maxW = 32;
    const maxH = 12;

    let logoW = maxW;
    let logoH = (logo.height / logo.width) * logoW;

    if (logoH > maxH) {
      logoH = maxH;
      logoW = (logo.width / logo.height) * logoH;
    }

    doc.addImage(logo.dataUrl, "JPEG", PAGE.marginX, 5, logoW, logoH);
  } else {
    doc.setFillColor(...hex(C.navy));
    doc.roundedRect(PAGE.marginX, 6, 22, 8, 2, 2, "F");

    doc.setFillColor(...hex(C.amber));
    doc.roundedRect(PAGE.marginX + 3, 9, 16, 2, 1, 1, "F");
  }

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.2);

  doc.text(safeText(meta.title, "Login Logout Activity Report"), pw - PAGE.marginX, 7.5, {
    align: "right",
    maxWidth: 130,
  });

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);

  const line1 = `Period: ${meta.period}`;
  const line2 = `Department: ${meta.department}${
    meta.isIndividual ? "" : `  |  Employee: ${meta.employee}`
  }`;

  doc.text(line1, pw - PAGE.marginX, 13.2, { align: "right" });
  doc.text(line2, pw - PAGE.marginX, 18.2, {
    align: "right",
    maxWidth: 160,
  });
}

function addFooter(doc) {
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const total = doc.internal.getNumberOfPages();

  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);

    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.25);
    doc.line(PAGE.marginX, ph - 12, pw - PAGE.marginX, ph - 12);

    doc.setTextColor(...hex(C.soft));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);

    doc.text(
      `Generated ${new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      PAGE.marginX,
      ph - 5
    );

    doc.text(`Page ${i} of ${total}`, pw - PAGE.marginX, ph - 5, {
      align: "right",
    });
  }
}

function ensureSpace(doc, y, needed, meta, logo) {
  const ph = doc.internal.pageSize.height;

  if (y + needed > ph - PAGE.bottom - 8) {
    doc.addPage();
    addHeader(doc, meta, logo);
    return PAGE.top + 5;
  }

  return y;
}

function emptyState(doc, y, message) {
  const pw = doc.internal.pageSize.width;

  doc.setFillColor(...hex(C.bg));
  doc.setDrawColor(...hex(C.border));
  doc.roundedRect(PAGE.marginX, y, pw - PAGE.marginX * 2, 24, 4, 4, "FD");

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(message, pw / 2, y + 14, { align: "center" });

  return y + 32;
}

function addMetricCard(doc, x, y, w, h, options = {}) {
  const {
    label,
    value,
    accent = C.navy,
    subText = "",
    valueSize = 14,
  } = options;

  doc.setFillColor(...hex(C.bg));
  doc.setDrawColor(...hex(C.border));
  doc.roundedRect(x, y, w, h, 4, 4, "FD");

  doc.setFillColor(...hex(accent));
  doc.roundedRect(x, y, 3.2, h, 1.4, 1.4, "F");

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  doc.text(label, x + 8, y + 7.5);

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(valueSize);
  doc.text(String(value), x + 8, y + 17);

  if (subText) {
    doc.setTextColor(...hex(C.muted));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.1);
    doc.text(subText, x + 8, y + 22);
  }
}

function addReportIntro(doc, y, userRows = [], meta = {}) {
  const pw = doc.internal.pageSize.width;
  const usersWithSessions = getUsersWithSessions(userRows);

  const totalUsers = usersWithSessions.length;

  const totalLogins = usersWithSessions.reduce(
    (sum, u) => sum + Number(getUserTotalLogins(u) || 0),
    0
  );

  const totalLogouts = usersWithSessions.reduce(
    (sum, u) => sum + Number(getUserTotalLogouts(u) || 0),
    0
  );

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);

  doc.text("Login Logout Activity", PAGE.marginX, y);

  y += 8;

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);

  const desc = "Login and logout activity timeline including timestamps, duration and location names.";

  doc.text(doc.splitTextToSize(desc, pw - PAGE.marginX * 2), PAGE.marginX, y);

  y += 12;

  const cardGap = 6;
  const cardH = 26;

  if (meta.isIndividual) {
    const cardW = pw - PAGE.marginX * 2;

    addMetricCard(doc, PAGE.marginX, y, cardW, cardH, {
      label: "LOGIN / LOGOUT ACTIVITY",
      value: `Logins: ${fn(totalLogins)}`,
      accent: C.green,
      subText: `Logouts: ${fn(totalLogouts)}`,
      valueSize: 12,
    });

    return y + cardH + 12;
  }

  const cardW = (pw - PAGE.marginX * 2 - cardGap) / 2;

  addMetricCard(doc, PAGE.marginX, y, cardW, cardH, {
    label: "EMPLOYEES WITH ACTIVITY",
    value: fn(totalUsers),
    accent: C.amber,
  });

  addMetricCard(doc, PAGE.marginX + cardW + cardGap, y, cardW, cardH, {
    label: "LOGIN / LOGOUT ACTIVITY",
    value: `Logins: ${fn(totalLogins)}`,
    accent: C.green,
    subText: `Logouts: ${fn(totalLogouts)}`,
    valueSize: 12,
  });

  return y + cardH + 12;
}

function addTable(doc, options = {}) {
  const {
    startY,
    head,
    body,
    columnStyles = {},
    headColor = C.navy,
    meta,
    logo,
    fontSize = 5.8,
    headFontSize = 5.9,
  } = options;

  autoTable(doc, {
    startY,
    head,
    body,
    theme: "grid",
    margin: {
      left: PAGE.marginX,
      right: PAGE.marginX,
      top: PAGE.top + 3,
      bottom: PAGE.bottom,
    },
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",

    tableLineColor: hex(C.border),
    tableLineWidth: 0.12,

    headStyles: {
      fillColor: hex(headColor),
      textColor: 255,
      fontSize: headFontSize,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: { top: 2.4, right: 1.8, bottom: 2.4, left: 1.8 },
      overflow: "linebreak",
    },

    bodyStyles: {
      fontSize,
      textColor: hex(C.text),
      cellPadding: { top: 2.1, right: 1.8, bottom: 2.1, left: 1.8 },
      valign: "middle",
      overflow: "linebreak",
      lineColor: hex(C.border),
      lineWidth: 0.1,
    },

    alternateRowStyles: {
      fillColor: hex(C.bg),
    },

    styles: {
      font: "helvetica",
      overflow: "linebreak",
      cellWidth: "wrap",
      minCellHeight: 6,
    },

    columnStyles,

    didDrawPage: () => {
      addHeader(doc, meta, logo);
    },
  });

  return doc.lastAutoTable.finalY || startY;
}

function addUserBlock(doc, y, user, meta, logo) {
  const pw = doc.internal.pageSize.width;

  y = ensureSpace(doc, y, 30, meta, logo);

  doc.setFillColor(...hex(C.white));
  doc.setDrawColor(...hex(C.border));
  doc.roundedRect(PAGE.marginX, y, pw - PAGE.marginX * 2, 15, 3, 3, "FD");

  doc.setTextColor(...hex(C.text));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const employeeTitle = `${safeText(user.name)}  •  ${safeText(
    user.department,
    "N/A"
  )}`;

  doc.text(
    doc.splitTextToSize(employeeTitle, pw - PAGE.marginX * 2 - 110)[0],
    PAGE.marginX + 6,
    y + 6
  );

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);

  doc.text(
    `Logins: ${fn(
      getUserTotalLogins(user)
    )}  |  Logouts: ${fn(getUserTotalLogouts(user))}`,
    pw - PAGE.marginX - 6,
    y + 6,
    { align: "right" }
  );

  doc.setTextColor(...hex(C.soft));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(
    "Login and logout activity with location details",
    PAGE.marginX + 6,
    y + 11.5
  );

  y += 20;

  const body = getActivities(user).map((act, idx) => {
    const loginLoc =
      act.loginLocation?.name || act.loginLocation?.address || "—";

    const logoutLoc =
      act.logoutLocation?.name || act.logoutLocation?.address || "—";

    return [
      idx + 1,
      fdt(act.loginTime),
      act.logoutTime ? fdt(act.logoutTime) : "—",
      durationText(act.loginTime, act.logoutTime),
      loginLoc,
      logoutLoc,
    ];
  });

  y = addTable(doc, {
    startY: y,
    meta,
    logo,
    head: [
      [
        "#",
        "Login Time",
        "Logout Time",
        "Duration",
        "Login Location",
        "Logout Location",
      ],
    ],
    body,
    headColor: C.navy2,
    fontSize: 6,
    headFontSize: 6.1,
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 42 },
      2: { cellWidth: 42 },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 75 },
      5: { cellWidth: 78 },
    },
  });

  return y + 8;
}

/* ──────────────────────────────────────────────────────────────
   EXPORT FUNCTION
────────────────────────────────────────────────────────────── */

export async function exportLoginLogoutPdf(data = {}) {
  const { userRows = [], filters = {}, fromDate, toDate } = data;

  const usersWithSessions = getUsersWithSessions(userRows);

  const meta = filterText({
    fromDate,
    toDate,
    filters,
    usersWithSessions,
  });

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;

  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);

  let y = PAGE.top + 7;

  y = addReportIntro(doc, y, userRows, meta);

  if (!usersWithSessions.length) {
    y = emptyState(
      doc,
      y,
      "No login logout activity available for selected filters."
    );
  } else {
    for (const user of usersWithSessions) {
      y = addUserBlock(doc, y, user, meta, logo);
    }
  }

  addFooter(doc);

  doc.save(reportFileName(fromDate, toDate, meta));
}

/* ──────────────────────────────────────────────────────────────
   ATTENDANCE REPORT PDF EXPORT
────────────────────────────────────────────────────────────── */

function getDayStatusLabel(activities, dateStr) {
  const dayActs = (activities || []).filter((act) => {
    if (!act.loginTime) return false;

    const d = new Date(act.loginTime);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;

    return ds === dateStr;
  });

  if (!dayActs.length) return "Absent";

  const latest = dayActs[dayActs.length - 1];
  const loginHr = new Date(latest.loginTime).getHours();
  const hasLogout = !!latest.logoutTime;

  if (!hasLogout) return "Absent";

  if (loginHr < 10) {
    const logoutHr = new Date(latest.logoutTime).getHours();
    if (logoutHr < 18) return "Half Day";
    return "Present";
  }

  return "Late";
}

function computeAttendanceStats(employee, fromDate, toDate) {
  const activities = employee.activities || [];
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
    const status = getDayStatusLabel(activities, dateStr);

    if (status === "Present") presentDays++;
    else if (status === "Absent") absentDays++;
    else if (status === "Late") lateDays++;
    else if (status === "Half Day") halfDays++;

    cursor.setDate(cursor.getDate() + 1);
  }

  const attendancePercent = workingDays > 0 ? Math.round(((presentDays + lateDays + halfDays * 0.5) / workingDays) * 100) : 0;

  return { workingDays, presentDays, absentDays, lateDays, halfDays, attendancePercent };
}

function renderMonthTable(doc, startY, monthLabel, monthDaysArr, employee) {
  const allActs = employee.activities || [];

  const dayRows = [];

  monthDaysArr.forEach((dayNum) => {
    const d = new Date(monthLabel + "-" + String(dayNum).padStart(2, "0"));
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    if (dayName === "Sunday") {
      dayRows.push([String(dayNum), dayName, "Week Off"]);
      return;
    }

    const dateStr = `${monthLabel}-${String(dayNum).padStart(2, "0")}`;
    const status = getDayStatusLabel(allActs, dateStr);

    dayRows.push([String(dayNum), dayName, status]);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...hex(C.navy));

  doc.text(
    new Date(monthLabel).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    PAGE.marginX,
    startY
  );

  startY += 5;

  const colW = [14, 22, 28];
  const tableX = PAGE.marginX;
  const rowH = 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setFillColor(...hex(C.bg2));
  doc.setDrawColor(...hex(C.border));
  doc.setTextColor(...hex(C.slate));

  ["Date", "Day", "Status"].forEach((label, i) => {
    const cx = tableX + colW.slice(0, i).reduce((a, b) => a + b, 0);
    doc.rect(cx, startY, colW[i], rowH, "FD");
    doc.text(label, cx + colW[i] / 2, startY + 3.5, { align: "center" });
  });

  startY += rowH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);

  dayRows.forEach(([dayNum, dayName, status]) => {
    const statusColors = {
      Present: { bg: "#DCFCE7", fg: "#166534" },
      Absent: { bg: "#FEE2E2", fg: "#991B1B" },
      Late: { bg: "#F3E8FF", fg: "#6B21A8" },
      "Half Day": { bg: "#FEF9C3", fg: "#854D0E" },
      "Week Off": { bg: "#F1F5F9", fg: "#64748B" },
    };

    const colors = statusColors[status] || {
      bg: "#F1F5F9",
      fg: "#64748B",
    };

    doc.setFillColor(...hex(colors.bg));
    doc.setDrawColor(...hex(C.border));

    doc.rect(tableX, startY, colW[0], rowH, "FD");
    doc.rect(tableX + colW[0], startY, colW[1], rowH, "FD");
    doc.rect(tableX + colW[0] + colW[1], startY, colW[2], rowH, "FD");

    doc.setTextColor(...hex(C.text));
    doc.text(dayNum, tableX + colW[0] / 2, startY + 3.5, {
      align: "center",
    });

    doc.text(dayName, tableX + colW[0] + colW[1] / 2, startY + 3.5, {
      align: "center",
    });

    doc.setTextColor(...hex(colors.fg));
    doc.text(status, tableX + colW[0] + colW[1] + colW[2] / 2, startY + 3.5, {
      align: "center",
    });

    startY += rowH;
  });

  return startY + 4;
}

export async function exportAttendancePdf(data = {}) {
  const { employeeRows = [], summary = {}, filters = {}, fromDate, toDate } = data;

  const isSingleEmployee = employeeRows.length === 1;

  const meta = {
    title: "Attendance Report",
    period: `${fd(fromDate)} — ${fd(toDate)}`,
    department:
      filters?.department && filters.department !== "all"
        ? filters.department
        : isSingleEmployee
        ? safeText(employeeRows?.[0]?.department, "All Departments")
        : "All Departments",
    employee:
      isSingleEmployee
        ? safeText(employeeRows?.[0]?.name, "Selected Employee")
        : filters?.employee && filters.employee !== "all"
        ? filters.employee
        : "All Employees",

    // Keep false so header continues to show:
    // Department | Employee
    // User name is already visible there, so detail section will not repeat it.
    isIndividual: false,
  };

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;

  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);

  let y = PAGE.top + 7;

  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const overallAttendance = Number(summary?.overallAttendance || 0);

  /* ──────────────────────────────────────────────────────────────
     Heading row
     - Overall Attendance shifted beside heading
     - No large separate card, so report starts cleaner
  ────────────────────────────────────────────────────────────── */

  const badgeW = 58;
  const badgeH = 14;
  const badgeX = pw - PAGE.marginX - badgeW;
  const badgeY = y - 6;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Attendance Report", PAGE.marginX, y);

  doc.setFillColor(...hex(C.bg));
  doc.setDrawColor(...hex(C.border));
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, "FD");

  doc.setFillColor(...hex(overallAttendance >= 80 ? C.green : C.amber));
  doc.roundedRect(badgeX, badgeY, 3, badgeH, 1.4, 1.4, "F");

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("OVERALL ATTENDANCE", badgeX + 7, badgeY + 5);

  doc.setTextColor(...hex(overallAttendance >= 80 ? C.green : C.amber));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`${overallAttendance}%`, badgeX + 7, badgeY + 11.2);

  y += 8;

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);

  const desc = isSingleEmployee
    ? "Daily attendance status with present, absent, late, half-day, and week-off records."
    : "Present, Absent, Late, and Half-Day records for all team members.";

  doc.text(doc.splitTextToSize(desc, badgeX - PAGE.marginX - 8), PAGE.marginX, y);

  y += 8;

  if (!employeeRows.length) {
    y = emptyState(doc, y, "No attendance records available for selected filters.");

    addFooter(doc);

    doc.save(
      `attendance-report-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(
        toDate
      ).replaceAll(" ", "-")}.pdf`
    );

    return;
  }

  /* ──────────────────────────────────────────────────────────────
     Summary table
     - In individual report, employee name is not repeated again
       because it is already visible in the header filters.
  ────────────────────────────────────────────────────────────── */

  const empHead = isSingleEmployee
    ? [["#", "Department", "Working", "Present", "Absent", "Late", "Half Day", "Att. %"]]
    : [
        [
          "#",
          "Employee",
          "Department",
          "Working",
          "Present",
          "Absent",
          "Late",
          "Half Day",
          "Att. %",
        ],
      ];

  const empBody = employeeRows.map((row, idx) => {
    const stats = fromDate && toDate
      ? computeAttendanceStats(row, fromDate, toDate)
      : row;

    const base = [
      idx + 1,
      safeText(row.department),
      fn(stats.workingDays),
      fn(stats.presentDays),
      fn(stats.absentDays),
      fn(stats.lateDays),
      fn(stats.halfDays),
      `${stats.attendancePercent || 0}%`,
    ];

    if (isSingleEmployee) return base;

    return [idx + 1, safeText(row.name), ...base.slice(1)];
  });

  y = addTable(doc, {
    startY: y,
    meta,
    logo,
    head: empHead,
    body: empBody,
    headColor: C.navy,
    fontSize: 5.7,
    headFontSize: 5.8,
    columnStyles: isSingleEmployee
      ? {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 54 },
          2: { cellWidth: 26, halign: "center" },
          3: { cellWidth: 26, halign: "center" },
          4: { cellWidth: 26, halign: "center" },
          5: { cellWidth: 26, halign: "center" },
          6: { cellWidth: 28, halign: "center" },
          7: { cellWidth: 26, halign: "center" },
        }
      : {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 20, halign: "center" },
          6: { cellWidth: 20, halign: "center" },
          7: { cellWidth: 22, halign: "center" },
          8: { cellWidth: 20, halign: "center" },
        },
  });

  if (isSingleEmployee) {
    const emp = employeeRows[0];
    const empStats = fromDate && toDate
      ? computeAttendanceStats(emp, fromDate, toDate)
      : emp;

    y = ensureSpace(doc, y, 24, meta, logo);
    y += 5;

    /* ──────────────────────────────────────────────────────────────
       Detail section header
       - Removed employee name repetition
       - Shows only section title + stats
    ────────────────────────────────────────────────────────────── */

    doc.setFillColor(...hex(C.bg2));
    doc.setDrawColor(...hex(C.border));
    doc.roundedRect(PAGE.marginX, y, pw - PAGE.marginX * 2, 10, 2.5, 2.5, "FD");

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.text("Daily Attendance Breakdown", PAGE.marginX + 5, y + 6.4);

    doc.setTextColor(...hex(C.muted));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.7);

    const statsText = `Present: ${fn(empStats.presentDays)}  |  Absent: ${fn(
      empStats.absentDays
    )}  |  Late: ${fn(empStats.lateDays)}  |  Half Day: ${fn(
      empStats.halfDays
    )}  |  Attendance: ${empStats.attendancePercent || 0}%`;

    doc.text(statsText, pw - PAGE.marginX - 5, y + 6.4, {
      align: "right",
      maxWidth: 170,
    });

    y += 15;

    const startDate = fromDate ? new Date(fromDate) : new Date();
    const endDate = toDate ? new Date(toDate) : new Date();

    const monthSet = new Set();
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (cursor <= endDate) {
      monthSet.add(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
          2,
          "0"
        )}`
      );

      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthList = Array.from(monthSet);

    for (let mi = 0; mi < monthList.length; mi += 1) {
      const mKey = monthList[mi];

      if (mi > 0) {
        doc.addPage();
        addHeader(doc, meta, logo);
        y = PAGE.top + 5;
      }

      const [yr, mo] = mKey.split("-").map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();

      let dayStart = 1;
      let dayEnd = lastDay;

      if (mKey === monthList[0]) {
        dayStart = startDate.getDate();
      }

      if (mKey === monthList[monthList.length - 1]) {
        dayEnd = endDate.getDate();
      }

      const monthDays = [];
      for (let i = dayStart; i <= dayEnd; i += 1) monthDays.push(i);

      const estimatedH = 10 + monthDays.length * 5;

      if (y + estimatedH > ph - PAGE.bottom - 8) {
        doc.addPage();
        addHeader(doc, meta, logo);
        y = PAGE.top + 5;
      }

      y = renderMonthTable(doc, y, mKey, monthDays, emp);
    }
  }

  addFooter(doc);

  doc.save(
    `attendance-report-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(
      toDate
    ).replaceAll(" ", "-")}.pdf`
  );
}

/* ──────────────────────────────────────────────────────────────
   SALES REPORT PDF EXPORT
   - Summary cards, manager table, team table, PO details
────────────────────────────────────────────────────────────── */

export async function exportSalesPdf(data = {}) {
  const { managerRows = [], teamRows = [], summary = {}, monthly = [], filters = {}, fromDate, toDate, targetMode = false } = data;

  const isIndividual = filters?.salesManager && filters.salesManager !== "all";
  const selectedManager = isIndividual ? managerRows[0] || null : null;

  const meta = {
    title: targetMode ? "Target vs Achievement Report" : "Sales Report",
    period: `${fd(fromDate)} — ${fd(toDate)}`,
    department: "Sales",
    employee: isIndividual ? safeText(selectedManager?.name || "Selected User") : "All",
    isIndividual,
  };

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;
  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;
  const pw = doc.internal.pageSize.width;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(targetMode ? "Target vs Achievement" : "Sales Report", PAGE.marginX, y);
  y += 8;

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  const desc = isIndividual
    ? `Sales performance and purchase orders for ${safeText(selectedManager?.name || "selected user")}.`
    : "Sales performance against targets with purchase order details.";
  doc.text(doc.splitTextToSize(desc, pw - PAGE.marginX * 2), PAGE.marginX, y);
  y += 10;

  const cardGap = 5;
  const cardH = 24;
  const cardW = (pw - PAGE.marginX * 2 - cardGap * 3) / 4;

  const mTarget = isIndividual && selectedManager ? selectedManager.target : summary.totalTarget;
  const mAchieved = isIndividual && selectedManager ? selectedManager.achieved : summary.totalAchieved;
  const mVariance = isIndividual && selectedManager ? selectedManager.variance : summary.variance;
  const mAchievementPct = isIndividual && selectedManager ? selectedManager.achievement : summary.achievementPercent;

  addMetricCard(doc, PAGE.marginX, y, cardW, cardH, {
    label: "TOTAL TARGET",
    value: `Rs. ${fn(mTarget || 0)}`,
    accent: C.navy,
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap), y, cardW, cardH, {
    label: "TOTAL ACHIEVEMENT",
    value: `Rs. ${fn(mAchieved || 0)}`,
    accent: C.green,
    subText: `${mAchievementPct || 0}% of target`,
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap) * 2, y, cardW, cardH, {
    label: "REMAINING",
    value: `Rs. ${fn(mVariance || 0)}`,
    accent: C.amber,
    subText: `${Math.max(0, 100 - Number(mAchievementPct || 0)).toFixed(2)}% gap`,
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap) * 3, y, cardW, cardH, {
    label: "ACHIEVEMENT %",
    value: `${mAchievementPct || 0}%`,
    accent: C.amber,
    valueSize: 10,
  });

  y += cardH + 12;

  if (!managerRows.length) {
    y = emptyState(doc, y, "No sales data available for selected filters.");
    addFooter(doc);
    doc.save(`sales-report-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
    return;
  }

  if (isIndividual && selectedManager) {
    const manager = selectedManager;
    y = ensureSpace(doc, y, 16, meta, logo);

    doc.setFillColor(...hex(C.bg2));
    doc.setDrawColor(...hex(C.border));
    doc.roundedRect(PAGE.marginX, y, pw - PAGE.marginX * 2, 10, 2.5, 2.5, "FD");

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(safeText(manager.name), PAGE.marginX + 5, y + 6.5);

    doc.setTextColor(...hex(C.muted));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(
      `Target: Rs. ${fn(manager.target)}  |  Achieved: Rs. ${fn(manager.achieved)}  |  Achievement: ${manager.achievement || 0}%  |  Remaining: Rs. ${fn(manager.variance)}`,
      pw - PAGE.marginX - 5, y + 6.5, { align: "right", maxWidth: 180 }
    );

    y += 15;
  } else if (teamRows.length > 0) {
    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Target of Executives", PAGE.marginX, y);
    y += 6;

    y = addTable(doc, {
      startY: y,
      meta,
      logo,
      head: [["#", "Executive", "Manager", "Target", "Achieved", "Achievement %", "Remaining"]],
      body: teamRows.map((row, idx) => [
        idx + 1,
        safeText(row.name),
        safeText(row.managerName || "-"),
        `Rs. ${fn(row.target)}`,
        `Rs. ${fn(row.achieved)}`,
        `${row.achievement || 0}%`,
        `Rs. ${fn(row.variance)}`,
      ]),
      headColor: C.navy,
      fontSize: 5.8,
      headFontSize: 6,
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
        3: { cellWidth: 36, halign: "right" },
        4: { cellWidth: 36, halign: "right" },
        5: { cellWidth: 24, halign: "center" },
        6: { cellWidth: 36, halign: "right" },
      },
    });

    y += 6;
  }

  // Purchase Order Details per manager
  const managersWithPos = managerRows.filter((row) => row.pos?.length > 0);
  if (managersWithPos.length > 0) {
    if (!isIndividual) {
      doc.setTextColor(...hex(C.navy));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Purchase Order Details", PAGE.marginX, y);
      y += 8;
    }

    for (const manager of managersWithPos) {
      y = ensureSpace(doc, y, 20, meta, logo);

      doc.setFillColor(...hex(C.bg2));
      doc.setDrawColor(...hex(C.border));
      doc.roundedRect(PAGE.marginX, y, pw - PAGE.marginX * 2, 8, 2, 2, "FD");

      doc.setTextColor(...hex(C.navy));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`${safeText(manager.name)} — ${manager.pos.length} PO(s)`, PAGE.marginX + 4, y + 5.5);

      y += 12;

      const poBody = manager.pos.map((po, idx) => [
        idx + 1,
        safeText(po.poNo),
        safeText(po.companyName),
        `Rs. ${fn(po.poValue)}`,
        fd(po.poDate),
        safeText(po.category || "-"),
        safeText(po.vendorName || "-"),
        safeText(po.status || "-"),
        safeText(po.activityStatus || "-"),
        safeText(po.trackingStatus || "-"),
      ]);

      y = addTable(doc, {
        startY: y,
        meta,
        logo,
        head: [["#", "PO No.", "Company", "Value", "Date", "Category", "Vendor", "Status", "Activity", "Tracking"]],
        body: poBody,
        headColor: C.navy2,
        fontSize: 5.5,
        headFontSize: 5.7,
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 26 },
          2: { cellWidth: 32 },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 26 },
          5: { cellWidth: 24 },
          6: { cellWidth: 28 },
          7: { cellWidth: 24 },
          8: { cellWidth: 28 },
          9: { cellWidth: 28 },
        },
      });

      y += 6;
    }
  }

  addFooter(doc);
  doc.save(`sales-report-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
}

/* ──────────────────────────────────────────────────────────────
   MEETINGS PDF EXPORT
────────────────────────────────────────────────────────────── */

function meetingMeta({ fromDate, toDate, meetings = [], filters = {} }) {
  const isIndividual = meetings.length === 1;
  const m = meetings[0] || {};
  const employee = m?.createdBy?.name || m?.createdBy || "All";
  const department = m?.createdBy?.department || filters?.department || "All";
  const title = isIndividual
    ? `${safeText(m.title, "Meeting")} - Details`
    : "Meetings Activity Report";
  return {
    period: `${fd(fromDate)} — ${fd(toDate)}`,
    department,
    employee,
    title,
    isIndividual,
  };
}

export async function exportMeetingsPdf(data = {}) {
  const { meetings = [], filters = {}, fromDate, toDate } = data;
  const meta = meetingMeta({ fromDate, toDate, meetings, filters });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  let logo = null;
  try { logo = await loadImg("/logo.jpeg"); } catch (_) { logo = null; }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Meetings Activity", PAGE.marginX, y);
  y += 8;
  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  doc.text(doc.splitTextToSize("Meeting schedules including title, date, location and status details.", pw(doc) - PAGE.marginX * 2), PAGE.marginX, y);
  y += 10;

  const cardW = pw(doc) - PAGE.marginX * 2;
  addMetricCard(doc, PAGE.marginX, y, cardW, 26, {
    label: "TOTAL MEETINGS",
    value: fn(meetings.length),
    accent: C.amber,
    subText: `Period: ${meta.period}`,
    valueSize: 12,
  });
  y += 34;

  if (!meetings.length) {
    y = emptyState(doc, y, "No meetings available for selected filters.");
  } else {
    for (const m of meetings) {
      y = ensureSpace(doc, y, 40, meta, logo);
      const pwVal = pw(doc);
      doc.setFillColor(...hex(C.white));
      doc.setDrawColor(...hex(C.border));
      doc.roundedRect(PAGE.marginX, y, pwVal - PAGE.marginX * 2, 15, 3, 3, "FD");
      doc.setTextColor(...hex(C.text));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(safeText(m.title, "Untitled Meeting"), pwVal - PAGE.marginX * 2 - 140)[0], PAGE.marginX + 6, y + 6);
      doc.setTextColor(...hex(C.muted));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.4);
      const statusTags = [m.status, m.isFollowUp ? "Follow-up" : "New", m.meetingType === "team" ? "Team" : "Client"].filter(Boolean).join("  |  ");
      doc.text(statusTags, pwVal - PAGE.marginX - 6, y + 6, { align: "right" });
      doc.setTextColor(...hex(C.soft));
      doc.setFontSize(6);
      const leadInfo = m.leadId ? `Lead: ${m.leadId}` : "";
      doc.text(leadInfo, PAGE.marginX + 6, y + 11.5);
      y += 20;

      const details = [];
      details.push(["Date & Time", `${fdt(m.startTime)} → ${fdt(m.endTime)}`]);
      if (m.location) details.push(["Location", m.location]);
      if (m.startLocation?.name) details.push(["Start Location", m.startLocation.name]);
      if (m.endLocation?.name) details.push(["End Location", m.endLocation.name]);
      if (m.personName) details.push(["Person", m.personName]);
      if (m.designation) details.push(["Designation", m.designation]);
      if (m.companyName) details.push(["Company", m.companyName]);
      if (m.createdBy?.name) details.push(["Created By", m.createdBy.name]);
      if (m.createdBy?.department) details.push(["Department", m.createdBy.department]);
      if (m.description) details.push(["Description", m.description]);
      if (m.attendees?.length) details.push(["Attendees", m.attendees.map((a) => (typeof a === "string" ? a : a.email)).join(", ")]);
      if (m.followUpRemark) details.push(["Follow-up Remark", m.followUpRemark]);
      if (m.cancellationRemark) details.push(["Cancellation Remark", m.cancellationRemark]);

      y = addTable(doc, {
        startY: y,
        meta,
        logo,
        head: [["Field", "Details"]],
        body: details,
        headColor: C.navy2,
        fontSize: 6,
        headFontSize: 6.1,
        columnStyles: {
          0: { cellWidth: 36, halign: "left" },
          1: { cellWidth: 178 },
        },
      });
      y += 8;
    }
  }

  addFooter(doc);
  const suffix = meta.isIndividual ? safeText(meetings[0]?.title, "meeting").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") : "meetings-activity";
  doc.save(`${suffix}-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
}

/* ──────────────────────────────────────────────────────────────
   MEETING REPORTS PDF EXPORT
────────────────────────────────────────────────────────────── */

export async function exportMeetingReportsPdf(data = {}) {
  const { reports = [], filters = {}, fromDate, toDate } = data;

  const isIndividual = reports.length === 1;
  const r = reports[0] || {};
  const meta = {
    period: `${fd(fromDate)} — ${fd(toDate)}`,
    department: r?.createdBy?.department || filters?.department || "All",
    employee: r?.createdBy?.name || "All",
    title: isIndividual ? `${safeText(r.meeting?.title || r.leadId || "Report", "Report")} - Report Details` : "Meeting Reports Activity Report",
    isIndividual,
  };

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  let logo = null;
  try { logo = await loadImg("/logo.jpeg"); } catch (_) { logo = null; }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Meeting Reports Activity", PAGE.marginX, y);
  y += 8;
  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  doc.text(doc.splitTextToSize("Meeting reports including lead status, deal value and follow-up details.", pw(doc) - PAGE.marginX * 2), PAGE.marginX, y);
  y += 10;

  const cardW = pw(doc) - PAGE.marginX * 2;
  addMetricCard(doc, PAGE.marginX, y, cardW, 26, {
    label: "TOTAL REPORTS",
    value: fn(reports.length),
    accent: C.amber,
    subText: `Period: ${meta.period}`,
    valueSize: 12,
  });
  y += 34;

  if (!reports.length) {
    y = emptyState(doc, y, "No meeting reports available for selected filters.");
  } else {
    for (const r of reports) {
      y = ensureSpace(doc, y, 40, meta, logo);
      const pwVal = pw(doc);
      const mt = r.meeting || {};
      doc.setFillColor(...hex(C.white));
      doc.setDrawColor(...hex(C.border));
      doc.roundedRect(PAGE.marginX, y, pwVal - PAGE.marginX * 2, 15, 3, 3, "FD");
      doc.setTextColor(...hex(C.text));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(safeText(mt.title || r.leadId || "Untitled Report"), pwVal - PAGE.marginX * 2 - 140)[0], PAGE.marginX + 6, y + 6);
      doc.setTextColor(...hex(C.muted));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.4);
      const tags = [r.reportType === "team" ? "Team" : "Client", r.leadStatus].filter(Boolean).join("  |  ");
      doc.text(tags, pwVal - PAGE.marginX - 6, y + 6, { align: "right" });
      doc.setTextColor(...hex(C.soft));
      doc.setFontSize(6);
      doc.text(r.leadId ? `Lead: ${r.leadId}` : "", PAGE.marginX + 6, y + 11.5);
      y += 20;

      const details = [];
      if (mt.title) details.push(["Meeting", mt.title]);
      details.push(["Date & Time", fdt(r.meetingDateTime)]);
      details.push(["Report Type", r.reportType === "team" ? "Team" : "Client"]);
      if (r.meetingPurpose) details.push(["Purpose", r.meetingPurpose]);
      if (r.leadStatus) details.push(["Lead Status", r.leadStatus]);
      details.push(["Deal Value", `Rs. ${fn(r.expectedDealValue || 0)}`]);
      if (r.companyName) details.push(["Company", r.companyName]);
      if (r.contactPerson) details.push(["Contact", r.contactPerson]);
      if (r.phoneNumber) details.push(["Phone", r.phoneNumber]);
      if (r.leadId) details.push(["Lead ID", r.leadId]);
      if (r.poReceived !== undefined) details.push(["PO Received", r.poReceived ? "Yes" : "No"]);
      if (r.purchaseOrderNumber) details.push(["PO Number", r.purchaseOrderNumber]);
      if (r.createdBy?.name) details.push(["Created By", r.createdBy.name]);
      if (r.createdBy?.department) details.push(["Department", r.createdBy.department]);
      if (r.notes) details.push(["Notes", r.notes]);
      if (r.meetingPoints) details.push(["Meeting Points", r.meetingPoints]);
      if (r.category) details.push(["Category", r.category]);
      if (r.paymentTerms) details.push(["Payment Terms", r.paymentTerms]);
      if (r.poDate) details.push(["PO Date", fdt(r.poDate)]);
      if (r.poExpectedDeliveryDate) details.push(["Expected Delivery", fdt(r.poExpectedDeliveryDate)]);
      if (r.leadClosedRemark) details.push(["Lead Closed Remark", r.leadClosedRemark]);

      y = addTable(doc, {
        startY: y,
        meta,
        logo,
        head: [["Field", "Details"]],
        body: details,
        headColor: C.navy2,
        fontSize: 6,
        headFontSize: 6.1,
        columnStyles: {
          0: { cellWidth: 36, halign: "left" },
          1: { cellWidth: 178 },
        },
      });
      y += 8;
    }
  }

  addFooter(doc);
  const suffix = isIndividual ? safeText(r.meeting?.title || r.leadId || "report", "report").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") : "meeting-reports-activity";
  doc.save(`${suffix}-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
}

/* ──────────────────────────────────────────────────────────────
   PO REPORTS PDF EXPORT
   - Summary cards, all purchase orders table
────────────────────────────────────────────────────────────── */

export async function exportPoPdf(data = {}) {
  const { purchaseOrders = [], summary = {}, filters = {}, fromDate, toDate } = data;

  const meta = {
    title: "PO Reports",
    period: `${fd(fromDate)} — ${fd(toDate)}`,
    department: filters.department || "All Departments",
    employee: "All",
    isIndividual: false,
  };

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;
  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;
  const pw = doc.internal.pageSize.width;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Purchase Order Report", PAGE.marginX, y);
  y += 8;

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  const desc = `Purchase order performance overview with ${purchaseOrders.length} POs across all categories.`;
  doc.text(doc.splitTextToSize(desc, pw - PAGE.marginX * 2), PAGE.marginX, y);
  y += 10;

  const cardGap = 4;
  const cardH = 24;
  const cardW = (pw - PAGE.marginX * 2 - cardGap * 4) / 5;

  addMetricCard(doc, PAGE.marginX, y, cardW, cardH, {
    label: "PO RECEIVED",
    value: fn(summary.received || 0),
    accent: "#1d86f5",
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap), y, cardW, cardH, {
    label: "PO COMPLETED",
    value: fn(summary.completed || 0),
    accent: C.green,
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap) * 2, y, cardW, cardH, {
    label: "PO DELIVERED",
    value: fn(summary.delivered || 0),
    accent: "#9a31ef",
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap) * 3, y, cardW, cardH, {
    label: "DELAYED POs",
    value: fn(summary.delayed || 0),
    accent: "#f29322",
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap) * 4, y, cardW, cardH, {
    label: "ON TIME DELIVERY",
    value: `${summary.onTimeDelivery || 0}%`,
    accent: "#10a7a7",
    valueSize: 10,
  });

  y += cardH + 12;

  if (!purchaseOrders.length) {
    y = emptyState(doc, y, "No purchase orders found for selected filters.");
    addFooter(doc);
    doc.save(`po-report-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
    return;
  }

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`All Purchase Orders (${purchaseOrders.length})`, PAGE.marginX, y);
  y += 8;

  const getStatus = (po) => po.activityStatus || po.trackingStatus || po.status || "-";

  const body = purchaseOrders.map((po, idx) => [
    idx + 1,
    safeText(po.poNo),
    safeText(po.companyName),
    `Rs. ${fn(po.poValue)}`,
    fd(po.poDate),
    safeText(po.category || "-"),
    getStatus(po),
    safeText(po.createdBy?.name || "-"),
  ]);

  y = addTable(doc, {
    startY: y,
    meta,
    logo,
    head: [["#", "PO No.", "Company", "Value", "Date", "Category", "Status", "Created By"]],
    body,
    headColor: C.navy,
    fontSize: 6,
    headFontSize: 6,
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 34 },
      2: { cellWidth: 40 },
      3: { cellWidth: 36, halign: "right" },
      4: { cellWidth: 30 },
      5: { cellWidth: 30 },
      6: { cellWidth: 36 },
      7: { cellWidth: 36 },
    },
  });

  addFooter(doc);
  doc.save(`po-report-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
}

/* ──────────────────────────────────────────────────────────────
   SINGLE PO DETAIL PDF EXPORT
   - Full PO details with remarks and status logs
────────────────────────────────────────────────────────────── */

export async function exportSinglePoDetailPdf(po = {}) {
  const meta = {
    title: `PO Details - ${safeText(po.poNo, "N/A")}`,
    period: fd(po.poDate),
    department: safeText(po.createdBy?.department || "All"),
    employee: safeText(po.createdBy?.name || "N/A"),
    isIndividual: true,
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;
  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;
  const pw = doc.internal.pageSize.width;
  const colW = (pw - PAGE.marginX * 2 - 6) / 2;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Purchase Order: ${safeText(po.poNo)}`, PAGE.marginX, y);
  y += 10;

  const fields = [
    ["PO Number", safeText(po.poNo)],
    ["PO Value", `Rs. ${fn(po.poValue)}`],
    ["Company", safeText(po.companyName)],
    ["Category", safeText(po.category || "Trading")],
    ["PO Date", fd(po.poDate)],
    ["Expected Delivery", fd(po.expectedDeliveryDate)],
    ["Status", safeText(po.activityStatus || po.trackingStatus || po.status)],
    ["Created By", safeText(po.createdBy?.name)],
    ["Delivery Date", fd(po.deliveryDate)],
    ["Payment Received", fd(po.paymentReceivedDate)],
    ["Approved By", safeText(po.approvedBy?.name)],
    ["Approved Date", fd(po.approvedDate)],
    ["Vendor", safeText(po.vendorName)],
    ["Processed By", safeText(po.processedBy?.name)],
    ["Processed Date", fd(po.processedDate)],
    ["Tracking Status", safeText(po.trackingStatus)],
  ];

  fields.forEach(([label, value], idx) => {
    y = ensureSpace(doc, y, 7, meta, logo);
    const x = PAGE.marginX + (idx % 2) * (colW + 6);

    doc.setTextColor(...hex(C.muted));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.text(label, x, y);

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(value, colW - 2), x, y + 4.5);

    if (idx % 2 === 1) y += 12;
  });

  if (fields.length % 2 === 1) y += 12;

  y += 4;

  const remarks = [];
  if (po.approvalRemarks) remarks.push(["Approval Remarks", po.approvalRemarks]);
  if (po.processingRemarks) remarks.push(["Processing Remarks", po.processingRemarks]);
  if (po.trackingRemarks) remarks.push(["Tracking Remarks", po.trackingRemarks]);
  if (po.remarks) remarks.push(["General Remarks", po.remarks]);

  if (remarks.length > 0) {
    y = ensureSpace(doc, y, 14, meta, logo);
    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
    y += 6;

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Remarks", PAGE.marginX, y);
    y += 7;

    remarks.forEach(([label, text]) => {
      y = ensureSpace(doc, y, 14, meta, logo);
      doc.setTextColor(...hex(C.muted));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text(label, PAGE.marginX, y);
      y += 5;

      doc.setTextColor(...hex(C.text));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(text, pw - PAGE.marginX * 2);
      lines.forEach((line) => {
        y = ensureSpace(doc, y, 5, meta, logo);
        doc.text(line, PAGE.marginX, y);
        y += 4.5;
      });
      y += 3;
    });
  }

  const logs = Array.isArray(po.statusLogs) ? po.statusLogs : [];

  if (logs.length > 0) {
    y = ensureSpace(doc, y, 14, meta, logo);
    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
    y += 6;

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Status Logs (${logs.length})`, PAGE.marginX, y);
    y += 8;

    const logBody = [...logs].reverse().map((log, idx) => [
      idx + 1,
      fd(log.updatedAt),
      safeText(log.oldStatus),
      safeText(log.newStatus),
      safeText(log.updatedByName || "-"),
      safeText(log.remark || "-"),
    ]);

    y = addTable(doc, {
      startY: y,
      meta,
      logo,
      head: [["#", "Date", "Old Status", "New Status", "Updated By", "Remark"]],
      body: logBody,
      headColor: C.navy,
      fontSize: 5.8,
      headFontSize: 6,
      columnStyles: {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 26 },
        2: { cellWidth: 32 },
        3: { cellWidth: 32 },
        4: { cellWidth: 32 },
        5: { cellWidth: 55 },
      },
    });
  }

  addFooter(doc);
  doc.save(`po-detail-${safeText(po.poNo, "po").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}

/* ──────────────────────────────────────────────────────────────
   MEETING LEADS PDF EXPORT
   - Leads (Meeting-wise) table export
────────────────────────────────────────────────────────────── */

export async function exportMeetingLeadsPdf(data = {}) {
  const { leadRows = [], filters = {}, fromDate, toDate } = data;

  const meta = {
    title: "Meeting Leads Report",
    period: `${fd(fromDate)} — ${fd(toDate)}`,
    department: filters.department || "All Departments",
    employee: "All",
    isIndividual: false,
  };

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;
  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;
  const pw = doc.internal.pageSize.width;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Leads (Meeting-wise)", PAGE.marginX, y);
  y += 8;

  doc.setTextColor(...hex(C.muted));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  const desc = `${leadRows.length} leads with meeting activity and follow-up details.`;
  doc.text(doc.splitTextToSize(desc, pw - PAGE.marginX * 2), PAGE.marginX, y);
  y += 6;

  if (!leadRows.length) {
    y = emptyState(doc, y, "No leads found for selected filters.");
    addFooter(doc);
    doc.save(`meeting-leads-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
    return;
  }

  const totalFollowUps = leadRows.reduce((sum, row) => sum + Number(row.followUpCount || 0), 0);
  const converted = leadRows.filter((row) => row.status === "converted").length;
  const closed = leadRows.filter((row) => row.status === "closed").length;

  const cardGap = 4;
  const cardH = 22;
  const cardW = (pw - PAGE.marginX * 2 - cardGap * 3) / 4;

  addMetricCard(doc, PAGE.marginX, y, cardW, cardH, {
    label: "TOTAL LEADS",
    value: fn(leadRows.length),
    accent: C.navy,
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap), y, cardW, cardH, {
    label: "CONVERTED",
    value: fn(converted),
    accent: C.green,
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap) * 2, y, cardW, cardH, {
    label: "CLOSED",
    value: fn(closed),
    accent: C.red,
    valueSize: 10,
  });
  addMetricCard(doc, PAGE.marginX + (cardW + cardGap) * 3, y, cardW, cardH, {
    label: "FOLLOW-UPS",
    value: fn(totalFollowUps),
    accent: C.amber,
    valueSize: 10,
  });

  y += cardH + 12;

  const body = leadRows.map((row, idx) => [
    idx + 1,
    safeText(row.leadId),
    safeText(row.companyName),
    safeText(row.contactPerson || "-"),
    safeText(row.originalMeetingTitle),
    safeText(row.status),
    fn(row.followUpCount || 0),
    safeText(row.latestLeadStatus || "-"),
    fd(row.latestActivityAt),
  ]);

  y = addTable(doc, {
    startY: y,
    meta,
    logo,
    head: [["#", "Lead ID", "Company", "Contact", "Meeting", "Status", "Follow-ups", "Lead Status", "Last Activity"]],
    body,
    headColor: C.navy,
    fontSize: 5.8,
    headFontSize: 6,
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 34 },
      3: { cellWidth: 28 },
      4: { cellWidth: 34 },
      5: { cellWidth: 22 },
      6: { cellWidth: 20, halign: "center" },
      7: { cellWidth: 24 },
      8: { cellWidth: 28 },
    },
  });

  addFooter(doc);
  doc.save(`meeting-leads-${fd(fromDate).replaceAll(" ", "-")}-to-${fd(toDate).replaceAll(" ", "-")}.pdf`);
}

/* ──────────────────────────────────────────────────────────────
   LEAD DETAIL PDF EXPORT
   - Full lead info, original meeting, follow-ups, reports
────────────────────────────────────────────────────────────── */

export async function exportLeadDetailPdf(lead = {}) {
  const meta = {
    title: `Lead - ${safeText(lead.leadId, "N/A")}`,
    period: fd(lead.latestActivityAt),
    department: "All",
    employee: safeText(lead.companyName || "N/A"),
    isIndividual: true,
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;
  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;
  const pw = doc.internal.pageSize.width;
  const colW = (pw - PAGE.marginX * 2 - 6) / 2;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Lead: ${safeText(lead.companyName || lead.leadId)}`, PAGE.marginX, y);
  y += 10;

  const leadFields = [
    ["Lead ID", safeText(lead.leadId)],
    ["Company", safeText(lead.companyName)],
    ["Contact Person", safeText(lead.contactPerson)],
    ["Phone", safeText(lead.phoneNumber)],
    ["Email", safeText(lead.email)],
    ["Designation", safeText(lead.designation)],
    ["Status", safeText(lead.status)],
    ["Latest Lead Status", safeText(lead.latestLeadStatus)],
    ["Deal Value", `Rs. ${fn(lead.latestDealValue || 0)}`],
    ["Follow-ups", fn(lead.followUpCount || 0)],
    ["Last Activity", fd(lead.latestActivityAt)],
  ];

  leadFields.forEach(([label, value], idx) => {
    y = ensureSpace(doc, y, 7, meta, logo);
    const x = PAGE.marginX + (idx % 2) * (colW + 6);

    doc.setTextColor(...hex(C.muted));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.text(label, x, y);

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(value, colW - 2), x, y + 4.5);

    if (idx % 2 === 1) y += 12;
  });

  y += 14;

  y = ensureSpace(doc, y, 14, meta, logo);
  doc.setDrawColor(...hex(C.border));
  doc.setLineWidth(0.2);
  doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
  y += 6;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Original Meeting", PAGE.marginX, y);
  y += 8;

  const meetingFields = [
    ["Meeting Title", safeText(lead.originalMeetingTitle)],
    ["Date", fd(lead.originalMeetingDate)],
    ["Location", safeText(lead.originalMeetingLocation)],
  ];

  meetingFields.forEach(([label, value], idx) => {
    y = ensureSpace(doc, y, 7, meta, logo);
    const x = PAGE.marginX + (idx % 2) * (colW + 6);

    doc.setTextColor(...hex(C.muted));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.text(label, x, y);

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(value, colW - 2), x, y + 4.5);

    if (idx % 2 === 1) y += 12;
  });

  y += 14;

  const followUps = Array.isArray(lead.followUpMeetings) ? lead.followUpMeetings : [];

  if (followUps.length > 0) {
    y = ensureSpace(doc, y, 14, meta, logo);
    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
    y += 6;

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Follow-up Meetings (${followUps.length})`, PAGE.marginX, y);
    y += 8;

    const fuBody = followUps.map((fu, idx) => [
      idx + 1,
      safeText(fu.title),
      fd(fu.startTime),
      safeText(fu.status || "-"),
      fu.meetingType === "team" ? "Team" : "Client",
      safeText(fu.createdBy?.name || "-"),
    ]);

    y = addTable(doc, {
      startY: y,
      meta,
      logo,
      head: [["#", "Meeting", "Date & Time", "Status", "Type", "By"]],
      body: fuBody,
      headColor: C.navy2,
      fontSize: 5.8,
      headFontSize: 6,
      columnStyles: {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 24 },
        4: { cellWidth: 22 },
        5: { cellWidth: 36 },
      },
    });

    y += 6;
  }

  const reports = Array.isArray(lead.reports) ? lead.reports : [];

  if (reports.length > 0) {
    y = ensureSpace(doc, y, 14, meta, logo);
    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
    y += 6;

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Meeting Reports (${reports.length})`, PAGE.marginX, y);
    y += 8;

    const rBody = reports.map((r, idx) => [
      idx + 1,
      safeText(r.meetingTitle),
      r.reportType === "client" ? "Client" : "Team",
      safeText(r.leadStatus || "-"),
      `Rs. ${fn(r.expectedDealValue || 0)}`,
      safeText(r.meetingPurpose || "-"),
      safeText(r.createdBy?.name || "-"),
    ]);

    y = addTable(doc, {
      startY: y,
      meta,
      logo,
      head: [["#", "Meeting", "Type", "Lead Status", "Deal Value", "Purpose", "By"]],
      body: rBody,
      headColor: C.navy2,
      fontSize: 5.8,
      headFontSize: 6,
      columnStyles: {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 34 },
        2: { cellWidth: 20 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 36 },
        6: { cellWidth: 32 },
      },
    });
  }

  addFooter(doc);
  doc.save(`lead-detail-${safeText(lead.leadId, "lead").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}

/* ──────────────────────────────────────────────────────────────
   MEETING REPORT DETAIL PDF EXPORT
   - Full report overview, client details, discussion, notes
────────────────────────────────────────────────────────────── */

export async function exportMeetingReportDetailPdf(report = {}) {
  const meta = {
    title: "Meeting Report Detail",
    period: fd(report.meetingDate),
    department: "All",
    employee: safeText(report.createdBy || "N/A"),
    isIndividual: true,
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let logo = null;
  try {
    logo = await loadImg("/logo.jpeg");
  } catch (_) {
    logo = null;
  }

  addHeader(doc, meta, logo);
  let y = PAGE.top + 7;
  const pw = doc.internal.pageSize.width;
  const colW = (pw - PAGE.marginX * 2 - 6) / 2;

  doc.setTextColor(...hex(C.navy));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Report: ${safeText(report.meetingTitle || "Meeting Report")}`, PAGE.marginX, y);
  y += 10;

  const overviewFields = [
    ["Type", safeText(report.reportType)],
    ["Submitted By", safeText(report.createdBy)],
    ["Meeting Date", fd(report.meetingDate)],
    ["Meeting Purpose", safeText(report.meetingPurpose)],
    ["Lead Status", safeText(report.leadStatus)],
    ["Expected Deal", `Rs. ${fn(report.expectedDealValue || 0)}`],
  ];

  overviewFields.forEach(([label, value], idx) => {
    y = ensureSpace(doc, y, 7, meta, logo);
    const x = PAGE.marginX + (idx % 2) * (colW + 6);

    doc.setTextColor(...hex(C.muted));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.text(label, x, y);

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(value, colW - 2), x, y + 4.5);

    if (idx % 2 === 1) y += 12;
  });

  y += 14;

  if (report.reportType === "client") {
    y = ensureSpace(doc, y, 14, meta, logo);
    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
    y += 6;

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Client Details", PAGE.marginX, y);
    y += 8;

    const clientFields = [
      ["Company", safeText(report.companyName)],
      ["Phone", safeText(report.phoneNumber)],
      ["Category", safeText(report.category)],
      ["Payment Terms", safeText(report.paymentTerms)],
      ["PO Received", report.poReceived ? "Yes" : "No"],
      ["PO Number", safeText(report.purchaseOrderNumber)],
    ];

    clientFields.forEach(([label, value], idx) => {
      y = ensureSpace(doc, y, 7, meta, logo);
      const x = PAGE.marginX + (idx % 2) * (colW + 6);

      doc.setTextColor(...hex(C.muted));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.text(label, x, y);

      doc.setTextColor(...hex(C.navy));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(doc.splitTextToSize(value, colW - 2), x, y + 4.5);

      if (idx % 2 === 1) y += 12;
    });

    y += 12;
  }

  if (report.meetingPoints && report.meetingPoints !== "-") {
    y = ensureSpace(doc, y, 20, meta, logo);
    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
    y += 6;

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Discussion Points", PAGE.marginX, y);
    y += 7;

    doc.setTextColor(...hex(C.text));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(report.meetingPoints, pw - PAGE.marginX * 2);
    lines.forEach((line) => {
      y = ensureSpace(doc, y, 5, meta, logo);
      doc.text(line, PAGE.marginX, y);
      y += 4.5;
    });

    y += 8;
  }

  if (report.notes && report.notes !== "-") {
    y = ensureSpace(doc, y, 20, meta, logo);
    doc.setDrawColor(...hex(C.border));
    doc.setLineWidth(0.2);
    doc.line(PAGE.marginX, y, pw - PAGE.marginX, y);
    y += 6;

    doc.setTextColor(...hex(C.navy));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notes", PAGE.marginX, y);
    y += 7;

    doc.setTextColor(...hex(C.text));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(report.notes, pw - PAGE.marginX * 2);
    lines.forEach((line) => {
      y = ensureSpace(doc, y, 5, meta, logo);
      doc.text(line, PAGE.marginX, y);
      y += 4.5;
    });
  }

  addFooter(doc);
  doc.save(`meeting-report-${safeText(report.meetingTitle || "report", "report").toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.pdf`);
}

function pw(doc) {
  return doc.internal.pageSize.width;
}