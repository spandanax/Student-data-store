import { escapeHtml } from './ui.js';

function clearSvg(svg){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
}

function lerp(a,b,t){ return a + (b-a)*t; }

export function renderDeptBarChart(svg, deptCounts){
  if(!svg) return;
  clearSvg(svg);
  const W = 640, H = 260;
  const padding = {l:52, r:16, t:18, b:40};
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;

  const max = Math.max(1, ...deptCounts.map(d=>d.count));
  const barGap = innerW / deptCounts.length;

  const gridLines = 4;
  for(let i=0;i<=gridLines;i++){
    const y = padding.t + innerH - (innerH/gridLines)*i;
    const val = (max/gridLines)*i;
    svg.insertAdjacentHTML('beforeend', `
      <line x1="${padding.l}" x2="${W - padding.r}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1" />
      <text x="${padding.l-8}" y="${y+4}" fill="rgba(234,240,255,.65)" font-size="12" text-anchor="end">${val.toFixed(0)}</text>
    `);
  }

  deptCounts.forEach((d,idx)=>{
    const x = padding.l + idx*barGap + barGap*0.18;
    const bw = barGap*0.64;
    const h = innerH * (d.count / max);
    const y = padding.t + innerH - h;

    const gradId = `g${idx}`;
    svg.insertAdjacentHTML('beforeend', `
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(124,92,255,.95)"/>
          <stop offset="100%" stop-color="rgba(78,214,255,.35)"/>
        </linearGradient>
      </defs>
      <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="10" fill="url(#${gradId})" stroke="rgba(255,255,255,.14)" />
      <text x="${x + bw/2}" y="${padding.t + innerH + 26}" fill="rgba(234,240,255,.70)" font-size="12" text-anchor="middle">${escapeHtml(d.department.split(' ')[0])}</text>
    `);
  });
}

export function renderYearBarChart(svg, yearDist){
  if(!svg) return;
  clearSvg(svg);
  const W = 640, H = 260;
  const padding = {l:52, r:16, t:18, b:40};
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;

  const max = Math.max(1, ...yearDist.map(d=>d.count));
  const barGap = innerW / yearDist.length;

  for(let i=0;i<=4;i++){
    const y = padding.t + innerH - (innerH/4)*i;
    const val = (max/4)*i;
    svg.insertAdjacentHTML('beforeend', `
      <line x1="${padding.l}" x2="${W - padding.r}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1" />
      <text x="${padding.l-8}" y="${y+4}" fill="rgba(234,240,255,.65)" font-size="12" text-anchor="end">${val.toFixed(0)}</text>
    `);
  }

  yearDist.forEach((d,idx)=>{
    const x = padding.l + idx*barGap + barGap*0.18;
    const bw = barGap*0.64;
    const h = innerH * (d.count / max);
    const y = padding.t + innerH - h;

    svg.insertAdjacentHTML('beforeend', `
      <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="10" fill="rgba(124,92,255,.35)" stroke="rgba(124,92,255,.55)" />
      <text x="${x + bw/2}" y="${padding.t + innerH + 26}" fill="rgba(234,240,255,.70)" font-size="12" text-anchor="middle">${escapeHtml(d.year.split(' ')[0])}</text>
    `);
  });
}

export function renderCgpaLineChart(svg, students){
  if(!svg) return;
  clearSvg(svg);
  const W = 640, H = 260;
  const padding = {l:52, r:16, t:18, b:40};
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;

  // Create a pseudo trend by grouping by admissionYear or index; for simplicity: use current cgpa distribution sorted
  const sorted = [...students].sort((a,b)=>Number(a.cgpa)-Number(b.cgpa));
  const samples = Math.min(10, sorted.length);
  const step = Math.max(1, Math.floor(sorted.length / samples));
  const points = [];
  for(let i=0;i<samples;i++){
    const s = sorted[i*step];
    if(!s) break;
    points.push({x:i, y:Number(s.cgpa)});
  }
  const max = 10, min = 0;

  const toX = (i)=> padding.l + (i/(Math.max(1,points.length-1)))*innerW;
  const toY = (val)=> padding.t + innerH - ((val-min)/(max-min))*innerH;

  // grid
  for(let i=0;i<=4;i++){
    const y = padding.t + innerH - (innerH/4)*i;
    const val = (max/4)*i;
    svg.insertAdjacentHTML('beforeend', `
      <line x1="${padding.l}" x2="${W - padding.r}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1" />
      <text x="${padding.l-8}" y="${y+4}" fill="rgba(234,240,255,.65)" font-size="12" text-anchor="end">${val.toFixed(0)}</text>
    `);
  }

  const d = points.map((p,i)=>`${toX(i)},${toY(p.y)}`).join(' ');
  const poly = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','polyline');
  poly.setAttribute('points', d);
  poly.setAttribute('fill','none');
  poly.setAttribute('stroke','rgba(78,214,255,.75)');
  poly.setAttribute('stroke-width','3');
  poly.setAttribute('stroke-linecap','round');
  poly.setAttribute('stroke-linejoin','round');
  svg.appendChild(poly);

  // gradient stroke effect via glow
  const glow = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','polyline');
  glow.setAttribute('points', d);
  glow.setAttribute('fill','none');
  glow.setAttribute('stroke','rgba(124,92,255,.45)');
  glow.setAttribute('stroke-width','7');
  glow.setAttribute('stroke-linecap','round');
  glow.setAttribute('stroke-linejoin','round');
  svg.insertBefore(glow, poly);

  points.forEach((p,i)=>{
    svg.insertAdjacentHTML('beforeend', `
      <circle cx="${toX(i)}" cy="${toY(p.y)}" r="6" fill="rgba(124,92,255,.95)" stroke="rgba(255,255,255,.22)" />
      <text x="${toX(i)}" y="${toY(p.y)-12}" text-anchor="middle" fill="rgba(234,240,255,.80)" font-size="12">${p.y.toFixed(1)}</text>
    `);
  });
}

export function renderSemesterAreaChart(svg, sgpaSeries){
  if(!svg) return;
  clearSvg(svg);
  const W = 640, H = 260;
  const padding = {l:52, r:16, t:18, b:40};
  const innerW = W - padding.l - padding.r;
  const innerH = H - padding.t - padding.b;

  const max = 10;
  const min = 0;

  const toX = (i)=> padding.l + (i/(Math.max(1,sgpaSeries.length-1)))*innerW;
  const toY = (val)=> padding.t + innerH - ((val-min)/(max-min))*innerH;

  const points = sgpaSeries.map((p,i)=>({x:toX(i), y:toY(Number(p.sgpa||0))}));
  const areaPath = `M ${points[0]?.x ?? padding.l} ${padding.t + innerH} ` +
    points.map(p=>`L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length-1]?.x ?? padding.l} ${padding.t + innerH} Z`;

  // grid
  for(let i=0;i<=4;i++){
    const y = padding.t + innerH - (innerH/4)*i;
    const val = (max/4)*i;
    svg.insertAdjacentHTML('beforeend', `
      <line x1="${padding.l}" x2="${W - padding.r}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1" />
      <text x="${padding.l-8}" y="${y+4}" fill="rgba(234,240,255,.65)" font-size="12" text-anchor="end">${val.toFixed(0)}</text>
    `);
  }

  svg.insertAdjacentHTML('beforeend', `
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(124,92,255,.55)"/>
        <stop offset="100%" stop-color="rgba(78,214,255,.10)"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#areaGrad)" stroke="rgba(78,214,255,.65)" stroke-width="2" />
  `);

  points.forEach((p,i)=>{
    svg.insertAdjacentHTML('beforeend', `
      <circle cx="${p.x}" cy="${p.y}" r="6" fill="rgba(78,214,255,.75)" stroke="rgba(255,255,255,.22)" />
      <text x="${p.x}" y="${p.y-12}" text-anchor="middle" fill="rgba(234,240,255,.85)" font-size="12">${Number(sgpaSeries[i].sgpa||0).toFixed(1)}</text>
    `);
  });

  sgpaSeries.forEach((p,i)=>{
    svg.insertAdjacentHTML('beforeend', `
      <text x="${toX(i)}" y="${padding.t + innerH + 26}" text-anchor="middle" fill="rgba(234,240,255,.70)" font-size="12">Sem ${p.semester}</text>
    `);
  });
}

export function renderAttendanceRadial(svg, percent){
  if(!svg) return;
  clearSvg(svg);
  const p = Math.max(0, Math.min(100, Number(percent||0)));
  const r = 84;
  const cx = 110, cy = 110;
  const circ = 2*Math.PI*r;
  const offset = circ*(1 - p/100);

  svg.insertAdjacentHTML('beforeend', `
    <defs>
      <linearGradient id="radGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(124,92,255,.95)"/>
        <stop offset="100%" stop-color="rgba(78,214,255,.55)"/>
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="rgba(255,255,255,.10)" stroke-width="16" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="url(#radGrad)" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" />
    <circle cx="${cx}" cy="${cy}" r="${r-20}" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.08)" stroke-width="1" />
  `);
}

export function renderPlacementDonut(svg, eligible, notEligible){
  if(!svg) return;
  clearSvg(svg);
  const total = Math.max(1, eligible+notEligible);
  const eligiblePct = eligible/total;

  const W = 300, H = 200;
  const cx = 85, cy = 95;
  const r = 60;
  const circ = 2*Math.PI*r;
  const offset = circ*(1-eligiblePct);

  svg.insertAdjacentHTML('beforeend', `
    <defs>
      <linearGradient id="donGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(43,228,184,.85)"/>
        <stop offset="100%" stop-color="rgba(78,214,255,.45)"/>
      </linearGradient>
      <linearGradient id="donGrad2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(255,77,109,.85)"/>
        <stop offset="100%" stop-color="rgba(255,176,32,.25)"/>
      </linearGradient>
    </defs>
    <text x="${cx}" y="40" font-size="14" fill="rgba(234,240,255,.70)" text-anchor="middle">Placement</text>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="rgba(255,255,255,.10)" stroke-width="18" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="url(#donGrad)" stroke-width="18" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" />
    <text x="${cx}" y="110" font-size="26" fill="rgba(234,240,255,.95)" text-anchor="middle" font-weight="900">${Math.round(eligiblePct*100)}%</text>

    <g transform="translate(150,50)">
      <rect x="0" y="0" width="120" height="28" rx="12" fill="rgba(43,228,184,.10)" stroke="rgba(43,228,184,.35)" />
      <text x="12" y="18" fill="rgba(43,228,184,.95)" font-size="12" font-weight="900">Eligible: ${eligible}</text>
      <rect x="0" y="40" width="120" height="28" rx="12" fill="rgba(255,77,109,.10)" stroke="rgba(255,77,109,.35)" />
      <text x="12" y="58" fill="rgba(255,77,109,.95)" font-size="12" font-weight="900">Not: ${notEligible}</text>
      <text x="0" y="98" fill="rgba(234,240,255,.65)" font-size="12">Total: ${eligible+notEligible}</text>
    </g>
  `);
}
