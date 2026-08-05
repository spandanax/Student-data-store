import {
  setActiveNav,
  showView,
  setLoading,
  setResultsSummary,
  setEmptyState,
  renderActivityLog,
  setStudentGridCompact,
  renderStudentCard,
  toast,
  loadPersistedSelections,
  escapeHtml as uiEscapeHtml,
} from "./modules/ui.js";
import {
  seedIfNeeded,
  listStudents,
  computeAnalytics,
  Departments,
  upsertStudent,
  deleteStudent,
  getStudentByRoll,
} from "./modules/students.js";
import {
  renderDeptBarChart,
  renderCgpaLineChart,
  renderAttendanceRadial,
  renderSemesterAreaChart,
  renderYearBarChart,
  renderPlacementDonut,
} from "./modules/charts.js";
import { qs, qsa } from "./modules/ui.js";
import {
  exportToCsv,
  exportToPdfPrint,
} from "./modules/export-import.js";

import {

  validateStudentInput,
  normalizeSkillList,
  normalizeCertList,
} from "./modules/validation.js";
import { getFilters, getSortPreferences, setFilters, setSortPreferences } from "./modules/storage.js";


const state = {
  searchTerm: "",
  filters: {},
  sort: { sortBy: "fullName", sortDir: "desc" },
  compact: false,
  currentDrawerRoll: null,
  editingRoll: null,
  pendingDeleteRoll: null,
};

// Keep the same dataset that the Dashboard currently renders, so Export CSV matches exactly.
let lastDashboardStudents = [];

function toSemesterNum(label) {
  const m = String(label || "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}
function toYearNum(label) {
  const m = String(label || "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function normStr(v) {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normDepartment(v) {
  const s = normStr(v);
  // tolerate truncated department strings (e.g. "Computer Science Engi")
  // by allowing prefix match against stored department.
  return s;
}

function normPlacement(v) {
  return normStr(v);
}

function normInternship(v) {
  return normStr(v);
}

function normalizeYearValue(v) {
  // Accept "1st Year" / "Year 1" / "1" and compare by extracted number.
  const n = toYearNum(v);
  return n;
}

function normalizeSemesterValue(v) {
  // Accept "1st Semester" / "Semester 1" / "1" and compare by extracted number.
  const n = toSemesterNum(v);
  return n;
}

function matchesSearch(s, term) {
  if (!term) return true;
  const t = normStr(term);
  const hay = [
    s.fullName,
    s.rollNumber,
    s.email,
    s.department,
    ...(s.skills || []),
    ...(s.certifications || []),
    ...(s.projects || []).map(
      (p) => p.title + " " + p.technology + " " + p.status,
    ),
    s.placementStatus,
    s.internshipStatus,
  ]
    .join(" ")
    .toLowerCase();
  return normStr(hay).includes(t);
}

function applyAllFilters(students) {
  const f = state.filters;
  const term = state.searchTerm;

  const parseNumOrNull = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const cgpaMin = parseNumOrNull(f.cgpaMin);
  const cgpaMax = parseNumOrNull(f.cgpaMax);
  const attMin = parseNumOrNull(f.attMin);
  const attMax = parseNumOrNull(f.attMax);

  const selected = {
    department: normDepartment(f.department),
    year: normalizeYearValue(f.year),
    semester: normalizeSemesterValue(f.semester),
    cgpaMin: cgpaMin,
    cgpaMax: cgpaMax,
    attendanceMin: attMin,
    attendanceMax: attMax,
    placementStatus: normPlacement(f.placementStatus),
    internshipStatus: normInternship(f.internshipStatus),
  };

  console.log("[Filters] Selected filter values:", {
    department: f.department,
    year: f.year,
    semester: f.semester,
    cgpaMin: f.cgpaMin,
    cgpaMax: f.cgpaMax,
    attendanceMin: f.attMin,
    attendanceMax: f.attMax,
    placementStatus: f.placementStatus,
    internshipStatus: f.internshipStatus,
    searchTerm: term,
    normalized: selected,
  });

  console.log("[Filters] Students before filtering:", students.length);
  const oneStudent = students[0] || null;
  console.log("[Filters] One student from storage:", oneStudent);

  const accepted = [];
  for (const s of students) {
    const reasons = [];

    if (!matchesSearch(s, term)) {
      reasons.push("searchTerm mismatch");
    }

    if (selected.department) {
      const sDeptNorm = normDepartment(s.department);
      // If user selected department, require that normalized selected value is contained in stored value OR vice versa.
      // This fixes truncated department strings like "... Engi".
      const ok =
        sDeptNorm.includes(selected.department) ||
        selected.department.includes(sDeptNorm);
      if (!ok) reasons.push(`department mismatch (student='${s.department}')`);
    }

    if (selected.year != null) {
      const sYear = normalizeYearValue(s.year);
      if (sYear !== selected.year)
        reasons.push(`year mismatch (student='${s.year}')`);
    }

    if (selected.semester != null) {
      const sSem = normalizeSemesterValue(s.semester);
      if (sSem !== selected.semester)
        reasons.push(`semester mismatch (student='${s.semester}')`);
    }

    const cgpa = Number(s.cgpa || 0);
    if (cgpaMin != null && cgpa < cgpaMin)
      reasons.push(`cgpaMin reject (student cgpa=${cgpa})`);
    if (cgpaMax != null && cgpa > cgpaMax)
      reasons.push(`cgpaMax reject (student cgpa=${cgpa})`);

    const att = Number(s.attendance || 0);
    if (attMin != null && att < attMin)
      reasons.push(`attendanceMin reject (student attendance=${att})`);
    if (attMax != null && att > attMax)
      reasons.push(`attendanceMax reject (student attendance=${att})`);

    if (selected.placementStatus) {
      const sPl = normPlacement(s.placementStatus);
      if (sPl !== selected.placementStatus)
        reasons.push(`placementStatus mismatch (student='${s.placementStatus}')`);
    }

    if (selected.internshipStatus) {
      const sIn = normInternship(s.internshipStatus);
      if (sIn !== selected.internshipStatus)
        reasons.push(`internshipStatus mismatch (student='${s.internshipStatus}')`);
    }

    if (reasons.length) {
      console.log(
        "[Filters] REJECT student",
        s.rollNumber,
        "reasons=",
        reasons,
      );
      continue;
    }

    console.log("[Filters] ACCEPT student", s.rollNumber);
    accepted.push(s);
  }

  console.log("[Filters] Students after filtering:", accepted.length);
  return accepted;
}


function sortStudents(students) {
  const { sortBy, sortDir } = state.sort;
  const dir = sortDir === "asc" ? 1 : -1;
  const get = (s) => {
    switch (sortBy) {
      case "fullName":
        return s.fullName;
      case "cgpa":
        return Number(s.cgpa || 0);
      case "attendance":
        return Number(s.attendance || 0);
      case "department":
        return s.department;
      case "admissionYear":
        return Number(s.admissionYear || 0);
      default:
        return s.fullName;
    }
  };
  return [...students].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (typeof av === "number" && typeof bv === "number")
      return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function buildFilters() {
  const deptSel = qs("#filterDepartment");
  Departments.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    deptSel.appendChild(opt);
  });

  const formDeptSel = qs("#fDepartment");
  Departments.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    formDeptSel.appendChild(opt);
  });
}

// Single source of truth for every dashboard widget: pass ONLY the filtered students.
function updateDashboard(filteredStudents) {
  const analytics = computeAnalytics(filteredStudents);

  // cards
  const metricsGrid = qs("#metricsGrid");
  const cards = [
    {
      label: "Total Students",
      value: analytics.total,
      foot: "Registered students in localStorage",
    },
    {
      label: "Average CGPA",
      value: analytics.avgCgpa.toFixed(2),
      foot: "Across all students",
    },
    {
      label: "Average Attendance",
      value: `${Math.round(analytics.avgAttendance)}%`,
      foot: "Mean attendance percentage",
    },
    {
      label: "Placement Eligible",
      value: analytics.placementEligible,
      foot: "Eligible for campus placement",
    },
    {
      label: "Students Above 9 CGPA",
      value: analytics.above9,
      foot: "High achievers",
    },
    {
      label: "Internship Completed",
      value: analytics.internshipCompleted,
      foot: "Completed internship status",
    },
    {
      label: "Department-wise Count",
      value: analytics.deptCounts.reduce((a, b) => a + b.count, 0),
      foot: "Distribution overview",
    },
    {
      label: "Top Performer",
      value: analytics.topPerformer
        ? analytics.topPerformer.fullName.split(" ")[0]
        : "--",
      foot: analytics.topPerformer
        ? `CGPA: ${analytics.topPerformer.cgpa.toFixed(2)}`
        : "No data",
    },
    {
      label: "Lowest Attendance Alert",
      value: analytics.lowestAttendance
        ? `${Math.round(analytics.lowestAttendance.attendance)}%`
        : "--",
      foot: analytics.lowestAttendance
        ? analytics.lowestAttendance.fullName
        : "No data",
    },
    {
      label: "Year-wise Distribution",
      value: analytics.yearDist.reduce((a, b) => a + b.count, 0),
      foot: "Counts by academic year",
    },
  ];

  metricsGrid.innerHTML = cards
    .map((c, i) => {
      const highlight =
        i === 1
          ? "rgba(78,214,255,.15)"
          : i === 3
            ? "rgba(43,228,184,.12)"
            : i === 8
              ? "rgba(255,77,109,.12)"
              : "rgba(255,255,255,.06)";
      return `
      <div class="metric-card glass" style="background:${highlight}">
        <div class="metric-top">
          <div class="metric-label">${c.label}</div>
          <div class="pill">Live</div>
        </div>
        <div class="metric-value">${c.value}</div>
        <div class="metric-foot">${c.foot}</div>
      </div>
    `;
    })
    .join("");

  // charts (must use filteredStudents only)
  updateCharts(filteredStudents, analytics);

  // cards: top performer + lowest attendance
  const top = analytics.topPerformer;
  qs("#topPerformerCard").innerHTML = top
    ? `
    <div class="student-card glass" style="cursor:default;">
      <div class="student-card-top">
        <div class="avatar">${top.fullName
          .split(" ")
          .slice(0, 2)
          .map((x) => x[0])
          .join("")
          .toUpperCase()}</div>
        <div style="flex:1;">
          <div class="student-name">${top.fullName}</div>
          <div class="student-meta">${top.department} • ${top.year}</div>
          <div class="tag-row" style="margin-top:10px;">
            <span class="tag good">CGPA: ${top.cgpa.toFixed(2)}</span>
            <span class="tag">Attendance: ${Math.round(top.attendance)}%</span>
            <span class="tag ${top.placementStatus === "Eligible" ? "good" : "bad"}">Placement: ${top.placementStatus}</span>
          </div>
        </div>
      </div>
    </div>
  `
    : `<div class="muted">No students.</div>`;

  const low = analytics.lowestAttendance;
  qs("#lowestAttendanceCard").innerHTML = low
    ? `
    <div class="student-card glass" style="border-color: rgba(255,77,109,.35); cursor:default;">
      <div class="student-card-top">
        <div class="avatar" style="background: linear-gradient(135deg, rgba(255,77,109,.55), rgba(255,176,32,.25));">${low.fullName
          .split(" ")
          .slice(0, 2)
          .map((x) => x[0])
          .join("")
          .toUpperCase()}</div>
        <div style="flex:1;">
          <div class="student-name">${low.fullName}</div>
          <div class="student-meta">${low.department} • ${low.semester}</div>
          <div class="tag-row" style="margin-top:10px;">
            <span class="tag bad">Attendance: ${Math.round(low.attendance)}%</span>
            <span class="tag">CGPA: ${low.cgpa.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  `
    : `<div class="muted">No students.</div>`;
}

function updateCharts(filteredStudents, analytics) {
  // charts (must use filteredStudents only)
  renderDeptBarChart(qs("#deptBarChart"), analytics.deptCounts);
  renderDeptBarChart(qs("#deptBarChart2"), analytics.deptCounts);
  renderAttendanceRadial(qs("#attendanceRadial"), analytics.avgAttendance);
  qs("#attendanceRadialCenter").textContent =
    `${Math.round(analytics.avgAttendance)}%`;
  renderCgpaLineChart(qs("#cgpaLineChart"), filteredStudents);
  renderSemesterAreaChart(qs("#semesterAreaChart"), analytics.sgpaSeries);
  renderYearBarChart(qs("#yearBarChart"), analytics.yearDist);
}


function renderStudentsList(filteredSorted) {
  const grid = qs("#studentGrid");
  grid.innerHTML = filteredSorted.map((st) => renderStudentCard(st)).join("");
  setEmptyState(filteredSorted.length === 0);
  setResultsSummary(
    `${filteredSorted.length} result${filteredSorted.length === 1 ? "" : "s"}`,
  );

  // card click handlers
  grid.querySelectorAll(".student-card").forEach((card) => {
    const roll = card.dataset.roll;
    const open = () => openDrawer(roll);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open();
    });
  });
}

function drawerSection(title, bodyHtml) {
  return `
    <div class="drawer-section">
      <h3>${title}</h3>
      ${bodyHtml}
    </div>
  `;
}

function openDrawer(rollNumber) {
  const student = getStudentByRoll(rollNumber);
  if (!student) return;
  state.currentDrawerRoll = rollNumber;

  const backdrop = qs("#drawerBackdrop");
  const drawer = qs("#studentDrawer");
  backdrop.classList.remove("is-hidden");
  drawer.classList.remove("is-hidden");

  const avatar = student.avatar
    ? `<img src="${student.avatar}" alt="avatar" style="width:52px;height:52px;border-radius:18px;"/>`
    : `<div class="avatar" style="width:52px;height:52px;border-radius:18px;">${student.fullName
        .split(" ")
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase()}</div>`;

  const cgpaBreakdown = `
    <div class="kv">
      <div class="item"><div class="k">CGPA</div><div class="v">${Number(student.cgpa || 0).toFixed(2)}</div></div>
      <div class="item"><div class="k">Admission Year</div><div class="v">${student.admissionYear ?? "--"}</div></div>
      <div class="item"><div class="k">Attendance</div><div class="v">${Math.round(student.attendance || 0)}%</div></div>
      <div class="item"><div class="k">Placement</div><div class="v">${student.placementStatus}</div></div>
    </div>
    <div style="margin-top:12px;">
      <svg viewBox="0 0 640 160" class="chart" style="height:160px;">
      </svg>
    </div>
  `;

  const sgpaRows = (student.semesterResults || [])
    .map(
      (r) => `
    <tr><td>Semester ${r.semester}</td><td>${Number(r.sgpa || 0).toFixed(2)}</td></tr>
  `,
    )
    .join("");

  const subjectsRows = (student.subjects || [])
    .map(
      (sub) => `
    <tr>
      <td>${escapeHtml(sub.subjectCode || "")}</td>
      <td>${escapeHtml(sub.subjectName || "")}</td>
      <td>${sub.credits ?? ""}</td>
      <td>${escapeHtml(sub.grade || "")}</td>
      <td>${sub.marks ?? ""}</td>
    </tr>
  `,
    )
    .join("");

  const projectsRows = (student.projects || [])
    .map(
      (p) => `
    <tr>
      <td>${escapeHtml(p.title || "")}</td>
      <td>${escapeHtml(p.technology || "")}</td>
      <td>${escapeHtml(p.status || "")}</td>
    </tr>
  `,
    )
    .join("");

  const skillsTags = (student.skills || [])
    .map((s) => `<span class="tag">${escapeHtml(s)}</span>`)
    .join("");
  const certTags = (student.certifications || [])
    .map((s) => `<span class="tag">${escapeHtml(s)}</span>`)
    .join("");

  qs("#drawerBody").innerHTML = `
    ${drawerSection(
      "Personal Information",
      `
      <div class="student-card glass" style="cursor:default;">
        <div class="student-card-top">
          <div>${avatar}</div>
          <div style="flex:1; min-width:0;">
            <div class="student-name">${escapeHtml(student.fullName)}</div>
            <div class="student-meta">${escapeHtml(student.department)} • ${escapeHtml(student.year)} • ${escapeHtml(student.semester)}</div>
            <div class="tag-row" style="margin-top:10px;">
              <span class="tag">Roll: ${escapeHtml(student.rollNumber)}</span>
              <span class="tag">Gender: ${escapeHtml(student.gender || "")}</span>
              <span class="tag">DOB: ${escapeHtml(student.dateOfBirth || "")}</span>
            </div>
          </div>
        </div>
        <div class="tag-row" style="margin-top:12px;">
          <span class="tag">${escapeHtml(student.email || "")}</span>
          <span class="tag">Phone: ${escapeHtml(student.phone || "")}</span>
        </div>
        <div class="tag-row" style="margin-top:8px;">
          <span class="tag">Blood: ${escapeHtml(student.bloodGroup || "")}</span>
          <span class="tag">Address: ${escapeHtml(student.address || "")}</span>
        </div>
        <div class="tag-row" style="margin-top:10px;">
          <button class="btn btn-ghost" id="editStudentBtn" type="button">Edit</button>
          <button class="btn btn-danger" id="deleteStudentBtn" type="button">Delete</button>
        </div>
      </div>
    `,
    )}

    ${drawerSection(
      "Academic Information",
      `
      ${cgpaBreakdown}
      <div class="divider"></div>
      <table class="table">
        <thead><tr><th>Semester</th><th>SGPA</th></tr></thead>
        <tbody>${sgpaRows || '<tr><td colspan="2" class="muted">No results</td></tr>'}</tbody>
      </table>
    `,
    )}

    ${drawerSection(
      "Attendance Record",
      `
      <div class="kv">
        <div class="item"><div class="k">Attendance %</div><div class="v">${Math.round(student.attendance || 0)}%</div></div>
        <div class="item"><div class="k">Placement Status</div><div class="v">${student.placementStatus}</div></div>
        <div class="item"><div class="k">Internship</div><div class="v">${student.internshipStatus}</div></div>
        <div class="item"><div class="k">Remarks</div><div class="v">${escapeHtml(student.remarks || "")}</div></div>
      </div>
    `,
    )}

    ${drawerSection(
      "Subject Marks",
      `
      <table class="table">
        <thead>
          <tr><th>Code</th><th>Subject</th><th>Credits</th><th>Grade</th><th>Marks</th></tr>
        </thead>
        <tbody>${subjectsRows || '<tr><td colspan="5" class="muted">No subjects</td></tr>'}</tbody>
      </table>
    `,
    )}

    ${drawerSection(
      "Projects",
      `
      <table class="table">
        <thead><tr><th>Title</th><th>Technology</th><th>Status</th></tr></thead>
        <tbody>${projectsRows || '<tr><td colspan="3" class="muted">No projects</td></tr>'}</tbody>
      </table>
    `,
    )}

    ${drawerSection(
      "Skills & Certifications",
      `
      <div class="tag-row">${skillsTags || '<span class="muted">No skills</span>'}</div>
      <div class="divider"></div>
      <div class="tag-row">${certTags || '<span class="muted">No certifications</span>'}</div>
    `,
    )}

    ${drawerSection(
      "Guardian Details",
      `
      <div class="kv">
        <div class="item"><div class="k">Guardian Name</div><div class="v">${escapeHtml(student.guardianName || "")}</div></div>
        <div class="item"><div class="k">Guardian Phone</div><div class="v">${escapeHtml(student.guardianPhone || "")}</div></div>
      </div>
    `,
    )}
  `;

  qs("#editStudentBtn")?.addEventListener("click", () =>
    openModalForEdit(rollNumber),
  );
  qs("#deleteStudentBtn")?.addEventListener("click", () =>
    openConfirmDelete(rollNumber),
  );

  // auto-close on backdrop click
  backdrop.onclick = () => closeDrawer();
  qs("#drawerCloseBtn").onclick = () => closeDrawer();
}

function closeDrawer() {
  state.currentDrawerRoll = null;
  const backdrop = qs("#drawerBackdrop");
  const drawer = qs("#studentDrawer");
  backdrop.classList.add("is-hidden");
  drawer.classList.add("is-hidden");
}

function openConfirmDelete(rollNumber) {
  state.pendingDeleteRoll = rollNumber;
  qs("#confirmBackdrop").classList.remove("is-hidden");
  qs("#confirmModal").classList.remove("is-hidden");
}

function closeConfirmDelete() {
  state.pendingDeleteRoll = null;
  qs("#confirmBackdrop").classList.add("is-hidden");
  qs("#confirmModal").classList.add("is-hidden");
}

function readFormValues() {
  const form = qs("#studentForm");
  const fd = new FormData(form);
  const input = {
    fullName: fd.get("fullName")?.toString() || "",
    rollNumber: fd.get("rollNumber")?.toString() || "",
    department: fd.get("department")?.toString() || "",
    year: fd.get("year")?.toString() || "",
    semester: fd.get("semester")?.toString() || "",
    email: fd.get("email")?.toString() || "",
    phone: fd.get("phone")?.toString() || "",
    gender: fd.get("gender")?.toString() || "Male",
    dateOfBirth: fd.get("dateOfBirth")?.toString() || "",
    address: fd.get("address")?.toString() || "",
    bloodGroup: fd.get("bloodGroup")?.toString() || "",
    guardianName: fd.get("guardianName")?.toString() || "",
    guardianPhone: fd.get("guardianPhone")?.toString() || "",
    admissionYear:
      Number(fd.get("admissionYear") ?? "") || new Date().getFullYear(),
    cgpa: Number(fd.get("cgpa") ?? "") || 0,
    attendance: Number(fd.get("attendance") ?? "") || 0,
    placementStatus: fd.get("placementStatus")?.toString() || "Not Eligible",
    internshipStatus: fd.get("internshipStatus")?.toString() || "Not Started",
    skills: normalizeSkillList(fd.get("skills")?.toString() || ""),
    certifications: normalizeCertList(
      fd.get("certifications")?.toString() || "",
    ),
    remarks: fd.get("remarks")?.toString() || "",
    avatar: fd.get("avatar")?.toString() || "",
  };
  return input;
}

function autoGenerateAcademicFieldsForNew(student) {
  // keep existing if present
  const s = { ...student };
  if (!Array.isArray(s.subjects) || !s.subjects.length) {
    const departmentSubjects = Departments.length ? null : null;
    // minimal placeholders based on department: handled by generator at seed; here we keep empty
    s.subjects = s.subjects || [];
  }
  s.semesterResults = Array.isArray(s.semesterResults)
    ? s.semesterResults
    : [{ semester: 1, sgpa: 7.5 }];
  s.projects = Array.isArray(s.projects)
    ? s.projects
    : [{ title: "Engineering Project", technology: "—", status: "Completed" }];
  return s;
}

function openModalForCreate() {
  state.editingRoll = null;
  qs("#studentModalTitle").textContent = "Add Student";
  qs("#studentForm").reset();
  qs("#fDepartment").value = Departments[0];
  qs("#fYear").value = "1st Year";
  qs("#fSemester").value = "1st Semester";
  qs("#fPlacementStatus").value = "Eligible";
  qs("#fInternshipStatus").value = "Completed";

  qs("#studentModal").classList.remove("is-hidden");
  qs("#modalBackdrop").classList.remove("is-hidden");
}

function openModalForEdit(rollNumber) {
  const s = getStudentByRoll(rollNumber);
  if (!s) return;
  state.editingRoll = rollNumber;
  qs("#studentModalTitle").textContent = "Edit Student";

  // fill
  qs("#fFullName").value = s.fullName || "";
  qs("#fRollNumber").value = s.rollNumber || "";
  qs("#fDepartment").value = s.department || Departments[0];
  qs("#fYear").value = s.year || "1st Year";
  qs("#fSemester").value = s.semester || "1st Semester";
  qs("#fEmail").value = s.email || "";
  qs("#fPhone").value = s.phone || "";
  qs("#fGender").value = s.gender || "Male";
  qs("#fDob").value = s.dateOfBirth || "";
  qs("#fAddress").value = s.address || "";
  qs("#fBloodGroup").value = s.bloodGroup || "";
  qs("#fGuardianName").value = s.guardianName || "";
  qs("#fGuardianPhone").value = s.guardianPhone || "";
  qs("#fAdmissionYear").value = s.admissionYear ?? "";
  qs("#fCgpa").value = s.cgpa ?? "";
  qs("#fAttendance").value = s.attendance ?? "";
  qs("#fPlacementStatus").value = s.placementStatus || "Eligible";
  qs("#fInternshipStatus").value = s.internshipStatus || "Completed";
  qs("#fSkills").value = (s.skills || []).join(", ");
  qs("#fCertifications").value = (s.certifications || []).join(", ");
  qs("#fRemarks").value = s.remarks || "";
  qs("#fAvatar").value = s.avatar || "";

  qs("#studentModal").classList.remove("is-hidden");
  qs("#modalBackdrop").classList.remove("is-hidden");
}

function closeModal() {
  qs("#studentModal").classList.add("is-hidden");
  qs("#modalBackdrop").classList.add("is-hidden");
  state.editingRoll = null;
}

function handleSaveStudent(e) {
  e.preventDefault();
  const input = readFormValues();

  const errors = validateStudentInput(input);
  const existing = listStudents().find(
    (s) => s.rollNumber === input.rollNumber,
  );
  if (!existing) {
    // rollNumber unique rule
  } else if (state.editingRoll !== input.rollNumber) {
    errors.push("Roll Number must be unique");
  }

  if (errors.length) {
    toast({ type: "bad", title: "Validation Error", message: errors[0] });
    return;
  }

  const student = {
    id: existing?.id || `STU${Date.now()}`,
    ...existing,
    ...input,
    // ensure arrays
    skills: input.skills,
    certifications: input.certifications,
    subjects: existing?.subjects ?? [],
    semesterResults: existing?.semesterResults ?? [],
    projects: existing?.projects ?? [],
  };

  // if no academic data, create basic defaults
  if (!student.subjects.length) {
    student.subjects = [];
  }
  if (!student.semesterResults.length) {
    student.semesterResults = [
      { semester: 1, sgpa: clampSgpa(input.cgpa || 7.5) },
    ];
  }

  upsertStudent(student);
  toast({
    type: "good",
    title: "Saved",
    message: `${student.fullName} (${student.rollNumber})`,
  });
  closeModal();
  closeDrawer();

  const all = listStudents();
  const filteredStudents = applyFilters(all);
  updateBothViews(filteredStudents);
  renderActivityLog();
}



function clampSgpa(cgpa) {
  const n = Number(cgpa);
  if (!Number.isFinite(n)) return 7.5;
  return Math.max(4, Math.min(10, n - 0.3));
}

function applySavedPreferences() {
  // persisted filters/sort
  loadPersistedSelections();
  const filters = getFilters();
  if (filters) state.filters = filters;

  const sort = getSortPreferences();
  if (sort) state.sort = sort;

  const compact = localStorage.getItem("compactMode");
  if (compact === "1") state.compact = true;
  setStudentGridCompact(state.compact);
  qs("#compactMode").checked = state.compact;
}

function gatherFiltersFromUi() {
  const f = {
    department: qs("#filterDepartment").value.trim(),
    year: qs("#filterYear").value.trim(),
    semester: qs("#filterSemester").value.trim(),
    cgpaMin: qs("#filterCgpaMin").value,
    cgpaMax: qs("#filterCgpaMax").value,
    attMin: qs("#filterAttMin").value,
    attMax: qs("#filterAttMax").value,
    placementStatus: qs("#filterPlacement").value.trim(),
    internshipStatus: qs("#filterInternship").value.trim(),
  };

  // normalize empties
  Object.keys(f).forEach((k) => {
    if (f[k] === "") f[k] = "";
  });

  state.filters = f;
}


function persistFiltersAndSort() {
  setFilters(state.filters);
  setSortPreferences(state.sort);
}

function updateSortFromUi() {
  state.sort.sortBy = qs("#sortBy").value;
  state.sort.sortDir = qs("#sortDir").value;
}

function renderStudentCards(filteredStudents) {
  const sorted = sortStudents(filteredStudents);
  renderStudentsList(sorted);
}

function applyFilters(allStudents) {
  // Single filtering pipeline (Students page + Dashboard)
  return applyAllFilters(allStudents);
}


function updateBothViews(filteredStudents) {
  // order requirement: cards -> dashboard -> charts (charts are inside updateDashboard)
  renderStudentCards(filteredStudents);
  updateDashboard(filteredStudents);
  lastDashboardStudents = filteredStudents;
  // updateCharts is already invoked inside updateDashboard to keep updateCharts unique.
}




function init() {
  setLoading(true);
  try {
    seedIfNeeded();
    buildFilters();

    // nav
    qsa(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        setActiveNav(view);
        showView(view);
        qs("#pageTitle").textContent = btn.textContent.trim();

        const all = listStudents();
        const filteredStudents = applyFilters(all);
        if (view === "dashboard" || view === "analytics") {
          updateDashboard(filteredStudents);
        }
        if (view === "students") {
          renderStudentCards(filteredStudents);
        }
      });
    });



    // search
    qs("#globalSearch").addEventListener("input", (e) => {
      state.searchTerm = e.target.value;
      const all = listStudents();
      const filteredStudents = applyFilters(all);
      updateBothViews(filteredStudents);
      renderActivityLog();
    });



    // filters
    [
      "filterDepartment",
      "filterYear",
      "filterSemester",
      "filterPlacement",
      "filterInternship",
    ].forEach((id) => {
      qs("#" + id).addEventListener("change", () => {
        gatherFiltersFromUi();
        persistFiltersAndSort();
        const all = listStudents();
        const filteredStudents = applyFilters(all);
        updateBothViews(filteredStudents);
        renderActivityLog();

      });
    });

    ["filterCgpaMin", "filterCgpaMax", "filterAttMin", "filterAttMax"].forEach(
      (id) => {
        qs("#" + id).addEventListener("input", () => {
          gatherFiltersFromUi();
        });
      },
    );

    qs("#applyFiltersBtn").addEventListener("click", () => {
      gatherFiltersFromUi();
      persistFiltersAndSort();

      const all = listStudents();
      // required single source of truth after clicking Apply
      const filteredStudents = applyFilters(all);

      renderStudentCards(filteredStudents);
      updateDashboard(filteredStudents);
      // updateCharts is invoked inside updateDashboard; no duplicate filtering/calculation

      renderActivityLog();

      toast({
        type: "good",
        title: "Filters applied",
        message: "Dashboard and student list updated",
      });
    });


    qs("#clearFiltersBtn").addEventListener("click", () => {
      state.filters = {
        department: "",
        year: "",
        semester: "",
        cgpaMin: "",
        cgpaMax: "",
        attMin: "",
        attMax: "",
        placementStatus: "",
        internshipStatus: "",
      };
      qs("#filterDepartment").value = "";
      qs("#filterYear").value = "";
      qs("#filterSemester").value = "";
      qs("#filterCgpaMin").value = "";
      qs("#filterCgpaMax").value = "";
      qs("#filterAttMin").value = "";
      qs("#filterAttMax").value = "";
      qs("#filterPlacement").value = "";
      qs("#filterInternship").value = "";
      persistFiltersAndSort();

      const all = listStudents();
      const filteredStudents = applyFilters(all);
      updateBothViews(filteredStudents);
      renderActivityLog();

      toast({
        type: "warn",
        title: "Filters reset",
        message: "Showing all students",
      });

    });


    // sort
    qs("#sortBy").addEventListener("change", () => {
      updateSortFromUi();
      persistFiltersAndSort();
      const all = listStudents();
      const filteredStudents = applyFilters(all);
      updateBothViews(filteredStudents);
      renderActivityLog();
    });
    qs("#sortDir").addEventListener("change", () => {
      updateSortFromUi();
      persistFiltersAndSort();
      const all = listStudents();
      const filteredStudents = applyFilters(all);
      updateBothViews(filteredStudents);
      renderActivityLog();
    });


    // compact
    qs("#compactMode").addEventListener("change", (e) => {
      state.compact = e.target.checked;
      setStudentGridCompact(state.compact);
      localStorage.setItem("compactMode", state.compact ? "1" : "0");
    });

    // create
    qs("#openCreateBtn").addEventListener("click", openModalForCreate);

    // modal close
    qs("#modalCloseBtn").addEventListener("click", closeModal);
    qs("#cancelBtn").addEventListener("click", closeModal);
    qs("#modalBackdrop").addEventListener("click", closeModal);

    // submit
    qs("#studentForm").addEventListener("submit", handleSaveStudent);

    // delete confirm
    qs("#confirmCloseBtn").addEventListener("click", closeConfirmDelete);
    qs("#confirmCancelBtn").addEventListener("click", closeConfirmDelete);
    qs("#confirmBackdrop").addEventListener("click", closeConfirmDelete);
    qs("#confirmDeleteBtn").addEventListener("click", () => {
      const roll = state.pendingDeleteRoll;
      if (!roll) return;
      const ok = deleteStudent(roll);
      if (ok) {
        toast({
          type: "good",
          title: "Deleted",
          message: "Student record removed",
        });
        closeConfirmDelete();
        closeDrawer();
        const all = listStudents();
        const filteredStudents = applyFilters(all);
        updateBothViews(filteredStudents);
        renderActivityLog();
      } else {

        toast({
          type: "bad",
          title: "Delete failed",
          message: "Student not found",
        });
      }
    });

    // import/export

    qs("#exportCsvBtn").addEventListener("click", () =>
      exportToCsv(lastDashboardStudents),
    );
    qs("#exportPdfBtn").addEventListener("click", () => exportToPdfPrint());



    // theme + persisted selections
    applySavedPreferences();

    // department dropdowns already built
    const all = listStudents();
    const filteredStudents = applyFilters(all);
    updateDashboard(filteredStudents);
    renderStudentCards(filteredStudents);
    lastDashboardStudents = filteredStudents;
    renderActivityLog();


    // fix select state after persisted load
    qs("#globalSearch").value = "";

    // navigation default
    setActiveNav("dashboard");
    showView("dashboard");
    qs("#pageTitle").textContent = "Dashboard";

    setLoading(false);
  } catch (e) {
    console.error(e);
    toast({
      type: "bad",
      title: "Startup error",
      message: e?.message || String(e),
    });
    setLoading(false);
  }
}

// use escapeHtml from ui.js (imported as uiEscapeHtml)
function escapeHtml(s) {
  return uiEscapeHtml(s);
}


function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// bootstrap
window.addEventListener("DOMContentLoaded", init);
