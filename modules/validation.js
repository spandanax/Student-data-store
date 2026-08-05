export function normalizeString(s){
  return (s ?? '').toString().trim();
}

export function isValidEmail(email){
  const v = normalizeString(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function digitsOnly(s){
  return normalizeString(s).replace(/\D/g,'');
}

export function validatePhone10(phone){
  return digitsOnly(phone).length === 10;
}

export function validateCGPA(cgpa){
  const n = Number(cgpa);
  return Number.isFinite(n) && n >= 0 && n <= 10;
}

export function validateAttendance(att){
  const n = Number(att);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

export function parseYearYearNum(yearLabel){
  // "1st Year" => 1
  const m = normalizeString(yearLabel).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function validateYearSemester(yearLabel, semesterLabel){
  const y = parseYearYearNum(yearLabel);
  const sm = normalizeString(semesterLabel).match(/(\d+)/);
  const s = sm ? Number(sm[1]) : null;
  const yearOk = y && y >= 1 && y <= 4;
  const semOk = s && s >= 1 && s <= 8;
  return { yearOk: !!yearOk, semOk: !!semOk };
}

export function normalizeSkillList(str){
  const items = normalizeString(str)
    .split(',')
    .map(x=>x.trim())
    .filter(Boolean);
  // de-dupe
  return Array.from(new Set(items)).slice(0,10);
}

export function normalizeCertList(str){
  const items = normalizeString(str)
    .split(',')
    .map(x=>x.trim())
    .filter(Boolean);
  return Array.from(new Set(items)).slice(0,10);
}

export function safeNumber(v, fallback=0){
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function validateStudentInput(input){
  const errors = [];
  if(!normalizeString(input.fullName)) errors.push('Name is required');
  if(!normalizeString(input.rollNumber)) errors.push('Roll Number is required');

  if(!isValidEmail(input.email)) errors.push('A valid Email is required');
  if(!validatePhone10(input.phone)) errors.push('Phone number must be exactly 10 digits');

  if(!validateCGPA(input.cgpa)) errors.push('CGPA must be between 0.0 and 10.0');
  if(!validateAttendance(input.attendance)) errors.push('Attendance must be between 0 and 100');

  const { yearOk, semOk } = validateYearSemester(input.year, input.semester);
  if(!yearOk) errors.push('Year must be between 1st and 4th Year');
  if(!semOk) errors.push('Semester must be between 1st and 8th Semester');

  if(input.guardianPhone && !validatePhone10(input.guardianPhone)) {
    errors.push('Guardian Phone must be exactly 10 digits (if provided)');
  }

  return errors;
}
