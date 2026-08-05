import { getTheme, setTheme, getFilters, getSortPreferences, setFilters, setSortPreferences, getActivityLogs } from './storage.js';

export function qs(sel, root=document){
  return root.querySelector(sel);
}
export function qsa(sel, root=document){
  return Array.from(root.querySelectorAll(sel));
}

export function setActiveNav(view){
  qsa('.nav-link').forEach(b => {
    b.classList.toggle('is-active', b.dataset.view === view);
  });
}

export function showView(view){
  qsa('[data-view-container]').forEach(v => {
    v.classList.toggle('is-hidden', v.dataset.viewContainer !== view);
  });
}

export function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(){
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  applyTheme(next);
  return next;
}

function formatNumber(n){
  const num = Number(n);
  if(!Number.isFinite(num)) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function toast({title='Notice', message='', type='good', ms=2600}={}){
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const id = crypto.randomUUID?.() ?? String(Date.now());
  el.dataset.toastId = id;
  el.innerHTML = `
    <div class="toast-top">
      <div>
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-msg">${escapeHtml(message)}</div>
      </div>
      <button class="icon-btn" style="width:34px;height:34px; border-radius:12px;" aria-label="Dismiss">✕</button>
    </div>
  `;
  document.getElementById('toasts')?.appendChild(el);
  const dismiss = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 180);
  };
  el.querySelector('button')?.addEventListener('click', dismiss);
  setTimeout(dismiss, ms);
}

export function escapeHtml(s=''){
  return String(s).replace(/[&<>'"]/g, (c)=>({ '&':'&amp;','<':'<','>':'>',"'":'&#39;','\"':'"' }[c]));
}

export function setLoading(isLoading){
  const overlay = qs('#loadingOverlay');
  if(!overlay) return;
  overlay.setAttribute('aria-hidden', String(!isLoading));
}

export function setResultsSummary(text){
  const el = qs('#resultsSummary');
  if(el) el.textContent = text;
}

export function setEmptyState(isHidden){
  const el = qs('#emptyState');
  if(!el) return;
  el.classList.toggle('is-hidden', isHidden);
}

export function setStudentGridCompact(isCompact){
  const grid = qs('#studentGrid');
  if(!grid) return;
  grid.classList.toggle('is-compact', isCompact);
}

export function renderStudentCard(student){
  const attendance = Number(student.attendance ?? 0);
  const cgpa = Number(student.cgpa ?? 0);
  const placementTag = student.placementStatus === 'Eligible'
    ? `<span class="tag good">Placement: Eligible</span>`
    : `<span class="tag bad">Placement: Not Eligible</span>`;
  const attTag = attendance >= 90
    ? `<span class="tag good">Attendance: ${Math.round(attendance)}%</span>`
    : attendance >= 75
      ? `<span class="tag warn">Attendance: ${Math.round(attendance)}%</span>`
      : `<span class="tag bad">Attendance: ${Math.round(attendance)}%</span>`;

  const avatarText = escapeHtml((student.fullName||'?').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase());

  const skills = (student.skills||[]).slice(0,3).map(s=>`<span class="tag">${escapeHtml(s)}</span>`).join('');
  return `
    <div class="student-card glass" role="button" tabindex="0" data-roll="${escapeHtml(student.rollNumber)}">
      <div class="student-card-top">
        <div class="avatar" aria-hidden="true">${avatarText}</div>
        <div style="flex:1; min-width: 0;">
          <div class="student-name" title="${escapeHtml(student.fullName)}">${escapeHtml(student.fullName)}</div>
          <div class="student-meta">${escapeHtml(student.department)} • ${escapeHtml(student.year)} • ${escapeHtml(student.semester)}</div>
        </div>
      </div>
      <div class="tag-row">
        <span class="tag good">CGPA: ${formatNumber(cgpa)}</span>
        ${placementTag}
        ${attTag}
      </div>
      <div class="tag-row">${skills}</div>
    </div>
  `;
}

export function setThemeToggleState(){
  const btn = qs('#themeToggle');
  if(!btn) return;
  const theme = getTheme();
  btn.innerHTML = `<span class="btn-icon" aria-hidden="true">${theme==='dark'?'🌙':'☀️'}</span><span>${theme==='dark'?'Dark':'Light'} Mode</span>`;
}

export function persistFiltersAndSort(filters, sortPreferences){
  setFilters(filters);
  setSortPreferences(sortPreferences);
}

export function loadPersistedSelections(){
  const filters = getFilters();
  const sort = getSortPreferences();
  if(filters){
    for(const [k,v] of Object.entries(filters)){
      const el = qs(`#filter${k[0].toUpperCase()}${k.slice(1)}`);
      if(el) el.value = v;
    }
    // special casing: cgpaMin/cgpaMax/attMin/attMax
    if('cgpaMin' in filters) qs('#filterCgpaMin') && (qs('#filterCgpaMin').value = filters.cgpaMin ?? '');
    if('cgpaMax' in filters) qs('#filterCgpaMax') && (qs('#filterCgpaMax').value = filters.cgpaMax ?? '');
    if('attMin' in filters) qs('#filterAttMin') && (qs('#filterAttMin').value = filters.attMin ?? '');
    if('attMax' in filters) qs('#filterAttMax') && (qs('#filterAttMax').value = filters.attMax ?? '');
    if('department' in filters) qs('#filterDepartment') && (qs('#filterDepartment').value = filters.department ?? '');
    if('year' in filters) qs('#filterYear') && (qs('#filterYear').value = filters.year ?? '');
    if('semester' in filters) qs('#filterSemester') && (qs('#filterSemester').value = filters.semester ?? '');
    if('placementStatus' in filters) qs('#filterPlacement') && (qs('#filterPlacement').value = filters.placementStatus ?? '');
    if('internshipStatus' in filters) qs('#filterInternship') && (qs('#filterInternship').value = filters.internshipStatus ?? '');
  }
  if(sort){
    if(qs('#sortBy')) qs('#sortBy').value = sort.sortBy ?? 'fullName';
    if(qs('#sortDir')) qs('#sortDir').value = sort.sortDir ?? 'desc';
  }
}

export function renderActivityLog(){
  const logs = getActivityLogs();
  const container = qs('#activityLog');
  if(!container) return;
  if(!logs.length){
    container.innerHTML = '<div class="empty-state">No activity yet.</div>';
    return;
  }
  container.innerHTML = logs.slice(0,16).map(l => {
    const dt = new Date(l.ts);
    const t = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    return `
      <div class="activity-item">
        <div class="t">${escapeHtml(l.action.replace(/_/g,' '))}</div>
        <div class="s">${escapeHtml(t)}</div>
        ${l.meta?.rollNumber ? `<div class="s">Roll: ${escapeHtml(l.meta.rollNumber)}</div>` : ''}
      </div>
    `;
  }).join('');
}
