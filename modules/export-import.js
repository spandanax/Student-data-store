import { getStudents, setStudents, updateActivity } from './storage.js';
import { upsertStudent, deleteStudent } from './students.js';
import { validateStudentInput, normalizeSkillList, normalizeCertList } from './validation.js';

function toCsvRow(cols){
  return cols.map(v => {
    const s = String(v ?? '');
    if(/[,"\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  }).join(',');
}

export function exportToJson(){
  const students = getStudents();
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), students }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `students-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportToCsv(){
  const students = getStudents();
  const headers = ['id','rollNumber','fullName','department','year','semester','email','phone','cgpa','attendance','placementStatus','internshipStatus','skills','certifications','remarks','admissionYear','gender'];
  const rows = students.map(s => toCsvRow([
    s.id,
    s.rollNumber,
    s.fullName,
    s.department,
    s.year,
    s.semester,
    s.email,
    s.phone,
    s.cgpa,
    s.attendance,
    s.placementStatus,
    s.internshipStatus,
    (s.skills||[]).join('|'),
    (s.certifications||[]).join('|'),
    s.remarks,
    s.admissionYear,
    s.gender
  ]));
  const csv = [toCsvRow(headers), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `students-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportToPdfPrint(){
  window.print();
}

function normalizeIncomingStudent(s){
  const base = { ...s };
  base.skills = Array.isArray(base.skills) ? base.skills : normalizeSkillList(base.skills);
  base.certifications = Array.isArray(base.certifications) ? base.certifications : normalizeCertList(base.certifications);
  base.subjects = Array.isArray(base.subjects) ? base.subjects : [];
  base.semesterResults = Array.isArray(base.semesterResults) ? base.semesterResults : [];
  base.projects = Array.isArray(base.projects) ? base.projects : [];
  return base;
}

export async function importJsonFromFile(file, toastFn){
  const text = await file.text();
  return importJsonFromText(text, toastFn);
}

export function importJsonFromText(text, toastFn){
  let parsed;
  try{
    parsed = JSON.parse(text);
  } catch {
    toastFn?.({type:'bad', title:'Import failed', message:'Invalid JSON'});
    return { ok:false };
  }

  const students = parsed?.students ?? parsed;
  if(!Array.isArray(students)){
    toastFn?.({type:'bad', title:'Import failed', message:'Expected an array of students or {students:[...]}'});
    return { ok:false };
  }

  let merged = 0;
  let rejected = 0;
  for(const raw of students){
    const s = normalizeIncomingStudent(raw);
    const errs = validateStudentInput({
      fullName: s.fullName,
      rollNumber: s.rollNumber,
      email: s.email,
      phone: s.phone,
      cgpa: s.cgpa,
      attendance: s.attendance,
      year: s.year,
      semester: s.semester,
      guardianPhone: s.guardianPhone
    });
    if(errs.length){
      rejected++;
      continue;
    }
    upsertStudent(s);
    merged++;
  }

  toastFn?.({
    type: rejected ? 'warn' : 'good',
    title: 'Import completed',
    message: `Merged ${merged} students${rejected ? `, rejected ${rejected}`:''}.`
  });

  updateActivity('students_imported', { merged, rejected });
  return { ok:true, merged, rejected };
}

export function wipeAllStudents(toastFn){
  setStudents([]);
  updateActivity('students_wiped', {});
  toastFn?.({type:'warn', title:'Dataset cleared', message:'All students removed from localStorage.'});
}
