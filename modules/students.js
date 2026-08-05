import { ensureDatasetSeeded, getStudents, setStudents, updateActivity } from './storage.js';

const SUBJECTS_BY_DEPT = {
  'Computer Science Engineering': [
    'Data Structures','Algorithms','DBMS','Operating Systems','Computer Networks','Software Engineering','Machine Learning','Artificial Intelligence','Cloud Computing','Cyber Security'
  ],
  'Information Science Engineering': [
    'Data Structures','Algorithms','Data Mining','Database Systems','Operating Systems','Distributed Systems','Machine Learning','Information Retrieval','Cloud Computing','Software Engineering'
  ],
  'Artificial Intelligence & Machine Learning': [
    'Machine Learning','Deep Learning','Computer Vision','Natural Language Processing','Data Mining','AI Ethics','Reinforcement Learning','Big Data Analytics','Cloud AI','Optimization'
  ],
  'Data Science': [
    'Statistics','Data Mining','Machine Learning','Big Data Processing','Database Systems','Data Visualization','Predictive Analytics','Experimental Design','Data Engineering','AI for Business'
  ],
  'Electronics & Communication Engineering': [
    'Digital Electronics','Analog Electronics','Microprocessors','VLSI','Communication Systems','Signal Processing','Embedded Systems','Control Systems','Network Theory','Microwave Engineering'
  ],
  'Electrical & Electronics Engineering': [
    'Power Systems','Electrical Machines','Control Systems','Power Electronics','Signals & Systems','Switchgear & Protection','Industrial Drives','Energy Management','Measurements','Renewable Energy'
  ],
  'Mechanical Engineering': [
    'Thermodynamics','Fluid Mechanics','Manufacturing Process','CAD/CAM','Machine Design','Heat Transfer','Industrial Engineering','Dynamics','Metallurgy','Robotics'
  ],
  'Civil Engineering': [
    'Structural Engineering','Surveying','Transportation Engineering','Concrete Technology','Geotechnical Engineering','Environmental Engineering','Engineering Mechanics','Remote Sensing','Hydraulics','Construction Management'
  ]
};

const DEPARTMENTS = Object.keys(SUBJECTS_BY_DEPT);

function deptShort(dept){
  const map = {
    'Computer Science Engineering':'CSE',
    'Information Science Engineering':'ISE',
    'Artificial Intelligence & Machine Learning':'AIML',
    'Data Science':'DS',
    'Electronics & Communication Engineering':'ECE',
    'Electrical & Electronics Engineering':'EEE',
    'Mechanical Engineering':'Mechanical',
    'Civil Engineering':'Civil'
  };
  return map[dept] ?? dept;
}

const FIRST_NAMES = ['Rahul','Aditi','Sahil','Isha','Vikram','Diya','Arjun','Meera','Karthik','Ananya','Nikhil','Sana','Pranav','Harini','Aditya','Neha','Rohit','Keerthi','Dev','Srujana','Ramesh','Lavanya','Tarun','Bhavya','Abhishek','Chaitra','Manoj','Janani','Gautham','Suman'];
const LAST_NAMES = ['Sharma','Kumar','Reddy','Patel','Iyer','Gowda','Singh','Rao','Nair','Bose','Verma','Chowdhury','Kulkarni','Menon','Gupta','Das','Jain','Mahajan','Saxena','Bhat'];

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function formatSemester(n){
  const suffix = (n===1||n===2||n===3) ? (n===1?'st':n===2?'nd':'rd') : 'th';
  return `${n}${suffix} Semester`;
}
function formatYear(n){
  const suffix = n===1?'st':n===2?'nd':n===3?'rd':'th';
  return `${n}${suffix} Year`;
}
function gradeFromMarks(m){
  if(m>=90) return 'A+';
  if(m>=85) return 'A';
  if(m>=80) return 'A-';
  if(m>=75) return 'B+';
  if(m>=70) return 'B';
  if(m>=65) return 'C+';
  if(m>=60) return 'C';
  return 'F';
}
function tagFromAttendance(a){
  if(a>=90) return { label:'good', text:'Excellent Attendance' };
  if(a>=75) return { label:'warn', text:'Moderate Attendance' };
  return { label:'bad', text:'Attendance Alert' };
}

function generateStudent(index){
  const department = DEPARTMENTS[index % DEPARTMENTS.length];
  const yearNum = clamp((Math.floor(index / DEPARTMENTS.length) % 4) + 1, 1, 4);
  const semesterNum = clamp((yearNum-1)*2 + (index % 2 ? 2 : 1), 1, 8);

  const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const rollNumber = `22${deptShort(department).replace(/[^A-Z]/g,'').slice(0,4)}${String(100 + index).slice(-3)}`.replace(/\s/g,'');
  const email = `${fullName.toLowerCase().replace(/\s+/g,'.')}@gmail.com`;
  const phone = String(randInt(6000000000, 9999999999));

  const cgpa = Math.round((6.8 + Math.random()*3.2)*100)/100; // 6.8 - 10
  const attendance = clamp(Math.round(65 + Math.random()*35), 0, 100);

  const subjectTitles = SUBJECTS_BY_DEPT[department];
  const subjectCount = 5;
  const subjects = [];
  for(let i=0;i<subjectCount;i++){
    const title = subjectTitles[(index + i*2) % subjectTitles.length];
    const credits = i%2===0 ? 4 : 3;
    const marks = clamp(Math.round(60 + Math.random()*36), 0, 100);
    const grade = gradeFromMarks(marks);
    const subjectCode = `${deptShort(department).replace(/[^A-Z]/g,'').slice(0,3)}6${i+1}`;
    subjects.push({
      subjectCode,
      subjectName: title,
      credits,
      grade,
      marks
    });
  }

  const semesterResults = [];
  const maxSem = 5;
  let base = cgpa - 0.9 + Math.random()*0.5;
  for(let s=1;s<=maxSem;s++){
    const sgpa = clamp(Math.round((base + s*(0.08+Math.random()*0.06))*100)/100, 4, 10);
    semesterResults.push({ semester: s, sgpa });
  }

  const skillsPool = ['Java','Python','C','C++','SQL','React','Node.js','AWS','Docker','TensorFlow','PyTorch','Machine Learning','NLP','Computer Vision','Git','Kubernetes','Data Analytics','Power BI','MATLAB'];
  const skills = Array.from(new Set([pick(skillsPool), pick(skillsPool), pick(skillsPool), pick(skillsPool)])).slice(0,4);

  const certifications = Array.from(new Set([`AWS Cloud Foundations`,`NPTEL ${skills[0] || 'Programming'} Programming`,`Google Cloud Basics`,`Coursera Data Science`].slice(0,2 + (index%2))));

  const projects = [
    {
      title: `AI Smart ${department.includes('Science') ? 'Insights' : department.includes('Civil') ? 'Surveying' : 'System'} Dashboard`,
      technology: `${skills.slice(0,2).join(', ')}, ${department.includes('Electronics')?'Verilog':'OpenCV'}`,
      status: (index%3===0?'Completed': index%3===1?'In Progress':'Completed')
    }
  ];

  const internshipStatus = index%3===0 ? 'Completed' : index%3===1 ? 'In Progress' : 'Not Started';
  const placementStatus = (cgpa>=8.2 && attendance>=80) ? 'Eligible' : 'Not Eligible';

  const avatar = '';

  return {
    id: `STU${String(1000 + index)}`,
    rollNumber,
    fullName,
    department,
    year: formatYear(yearNum),
    semester: formatSemester(semesterNum),
    email,
    phone,
    gender: index%3===0?'Male':index%3===1?'Female':'Other',
    dateOfBirth: `200${randInt(1,9)}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,
    address: ['Bangalore, Karnataka','Chennai, Tamil Nadu','Hyderabad, Telangana','Pune, Maharashtra','Coimbatore, Tamil Nadu','Mysuru, Karnataka'][index % 6],
    bloodGroup: ['A+','A-','B+','B-','O+','O-','AB+','AB-'][index % 8],
    guardianName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    guardianPhone: String(randInt(6000000000, 9999999999)),
    admissionYear: 2022 - (index%3),
    cgpa,
    attendance,
    placementStatus,
    internshipStatus,
    skills,
    certifications,
    subjects,
    semesterResults,
    projects,
    remarks: cgpa>=9 ? 'Outstanding academic performance' : attendance<75 ? 'Needs improvement in attendance and consistency' : 'Consistent performance with strong fundamentals',
    avatar
  };
}

export function seedIfNeeded(){
  return ensureDatasetSeeded(() => {
    // Generate 10 sample student records covering a range of departments,
    // years, semesters, CGPA and attendance so every chart has data.
    const students = Array.from({length: 10}, (_,i) => generateStudent(i));
    return students;
  });
}

export function listStudents(){
  return getStudents();
}

export function upsertStudent(student){
  const students = getStudents();
  const idx = students.findIndex(s => s.rollNumber === student.rollNumber);
  if(idx >= 0){
    students[idx] = { ...students[idx], ...student, id: students[idx].id };
    setStudents(students);
    updateActivity('student_updated', { rollNumber: student.rollNumber });
    return students[idx];
  }
  students.unshift(student);
  setStudents(students);
  updateActivity('student_created', { rollNumber: student.rollNumber });
  return student;
}

export function deleteStudent(rollNumber){
  const students = getStudents();
  const before = students.length;
  const next = students.filter(s => s.rollNumber !== rollNumber);
  if(next.length === before) return false;
  setStudents(next);
  updateActivity('student_deleted', { rollNumber });
  return true;
}

export function getStudentByRoll(rollNumber){
  return getStudents().find(s => s.rollNumber === rollNumber) || null;
}

export function computeAnalytics(students){
  const total = students.length;
  const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

  const avgCgpa = avg(students.map(s=>Number(s.cgpa||0)));
  const avgAttendance = avg(students.map(s=>Number(s.attendance||0)));
  const placementEligible = students.filter(s=>s.placementStatus === 'Eligible').length;
  const above9 = students.filter(s=>Number(s.cgpa||0) > 9).length;
  const internshipCompleted = students.filter(s=>s.internshipStatus === 'Completed').length;

  const deptCounts = DEPARTMENTS.map(d => ({ department: d, count: students.filter(s=>s.department===d).length }));
  const byCgpa = [...students].sort((a,b)=>Number(b.cgpa)-Number(a.cgpa));
  const topPerformer = byCgpa[0] || null;
  const lowestAttendance = [...students].sort((a,b)=>Number(a.attendance)-Number(b.attendance))[0] || null;

  const yearDist = [1,2,3,4].map(y => ({ year: `${y}${y===1?'st':y===2?'nd':y===3?'rd':'th'} Year`, count: students.filter(s=>s.year===formatYear(y)).length }));

  // SGPA progression (area chart): use semesterResults sgpa averaged per semester index
  const maxSem = 5;
  const sgpaBySem = Array.from({length:maxSem}, (_,i)=>({ sem:i+1, values: [] }));
  for(const s of students){
    for(const r of (s.semesterResults||[])){
      if(r.semester>=1 && r.semester<=maxSem) sgpaBySem[r.semester-1].values.push(Number(r.sgpa||0));
    }
  }
  const sgpaSeries = sgpaBySem.map(x => ({ semester: x.sem, sgpa: avg(x.values) }));

  return {
    total,
    avgCgpa,
    avgAttendance,
    placementEligible,
    above9,
    internshipCompleted,
    deptCounts,
    topPerformer,
    lowestAttendance,
    yearDist,
    sgpaSeries
  };
}

export const Departments = DEPARTMENTS;
