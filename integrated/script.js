const { POINTS, PAY } = window.INDEX_SCROLL_THREAT_DATA || {};
const { GAP, CATCH, SHORT } = window.INDEX_SCROLL_PAY_DATA || {};
const { ATRO, PREM, TASKS } = window.INDEX_SCROLL_VERIFY_DATA || {};
const { languageSkills, redraftWeights } = window.INDEX_SCROLL_REDRAFT_DATA || {};
const readColor = name =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || `var(${name})`;
const palette = {
  ink: readColor("--ink"),
  text: readColor("--text"),
  textSoft: readColor("--text-soft"),
  muted: readColor("--muted"),
  inverse: readColor("--inverse"),
  grid: readColor("--grid"),
  surfaceSoft: readColor("--surface-soft"),
  night: readColor("--night"),
  greenDark: readColor("--green-dark"),
  blue: readColor("--blue"),
  cyan: readColor("--cyan"),
  red: readColor("--red"),
  orange: readColor("--orange"),
  gold: readColor("--gold"),
  violet: readColor("--violet"),
  pink: readColor("--pink"),
  slate: readColor("--slate"),
  catCoding: readColor("--cat-coding"),
  catQuality: readColor("--cat-quality"),
  catDocs: readColor("--cat-docs"),
  catLearning: readColor("--cat-learning"),
  catPlanning: readColor("--cat-planning"),
  catOps: readColor("--cat-ops"),
  catProblem: readColor("--cat-problem"),
  catDesign: readColor("--cat-design"),
  catComm: readColor("--cat-comm"),
  catDomain: readColor("--cat-domain"),
  catFund: readColor("--cat-fund"),
  catAi: readColor("--cat-ai"),
  catAdapt: readColor("--cat-adapt")
};
// Source script block 1.
// Act 1 — "Y-axis morph": the SAME developer dots first sit on a REAL AI-use
// frequency axis (threatened devs skew higher), then slide to a salary axis where
// the three group medians fall level. Driven by scroll via window.__threatSetMode.
(function(){
  const tip = d3.select("#tooltip");
  const showTip = (e,h)=>tip.html(h).style("left",e.clientX+"px").style("top",e.clientY+"px").classed("visible",true);
  const hideTip = ()=>tip.classed("visible",false);

  const fmtK = d => "$" + d3.format(".0f")(d/1000) + "K";
  const fmt$ = d => "$" + d3.format(",")(Math.round(d));

  const W=980, H=520, m={t:92,r:60,b:58,l:84};   // l:84 keeps the rotated axis title clear of the (longer) AI-frequency tick labels
  const svg = d3.select("#gi-svg");
  const groups = ["Feel threatened","Not threatened","Unsure"];   // x categories
  const threatByGroup = {}; PAY.forEach(p=>threatByGroup[p.threat]=p);

  // real AI-use frequency per group (see threat_salary_data.js → AI_USE)
  const AI = (window.INDEX_SCROLL_THREAT_DATA && window.INDEX_SCROLL_THREAT_DATA.AI_USE) || {
    levels:["Won't","Plan to","Monthly","Weekly","Daily"],
    meanByGroup:{"Feel threatened":2.82,"Not threatened":2.49,"Unsure":2.75},
    threatRateLow:12, threatRateHigh:18, dailyShareByGroup:{"Feel threatened":49,"Not threatened":40,"Unsure":45}
  };

  const x   = d3.scalePoint().domain(groups).range([m.l+90, W-m.r-90]).padding(0.5);
  const ySal= d3.scaleLinear().domain([0,300000]).range([H-m.b, m.t]).clamp(true);   // salary
  const yAI = d3.scaleLinear().domain([-0.4,4.4]).range([H-m.b, m.t]).clamp(true);   // AI cadence 0..4

  // build one node per developer: each POINTS entry is [real salary, real AI-use level]
  const nodes=[];
  groups.forEach((grp,gi)=>{
    (POINTS[grp]||[]).forEach(p=>{ nodes.push({grp,gi,v:p[0],ai:p[1]}); });
  });

  // beeswarm horizontal offsets for a set of {idx,cy} (same collision walk as before)
  function offsets(items,r){
    const sorted=[...items].sort((a,b)=>a.cy-b.cy);
    const placed=[]; const out=new Array(items.length);
    sorted.forEach(it=>{
      let o=0,step=0,ok=false,tries=0;
      while(!ok && tries<160){
        ok=placed.every(p=>Math.abs(p.cy-it.cy)>2*r || Math.abs(p.ox-o)>2*r);
        if(ok) break;
        step++; o=(step%2?1:-1)*Math.ceil(step/2)*(2*r); tries++;
      }
      placed.push({cy:it.cy,ox:o}); out[it.idx]=o;
    });
    return out;
  }

  const R=2.7;
  groups.forEach((grp,gi)=>{
    const gn=nodes.filter(n=>n.gi===gi);
    const salOX=offsets(gn.map((n,k)=>({idx:k,cy:ySal(n.v)})),R);
    const aiOX =offsets(gn.map((n,k)=>({idx:k,cy:yAI(n.ai)})),R);
    gn.forEach((n,k)=>{ n.cx=x(grp); n.salOX=salOX[k]; n.aiOX=aiOX[k]; n.salY=ySal(n.v); n.aiY=yAI(n.ai); });
  });

  const colorOf = grp => grp==="Feel threatened" ? "var(--red)"
                       : grp==="Not threatened" ? palette.greenDark
                       : palette.slate;

  // left axes (salary + AI), cross-faded by mode
  const axS = svg.append("g").attr("class","axis").attr("transform","translate("+m.l+",0)")
    .call(d3.axisLeft(ySal).ticks(6).tickFormat(fmtK));
  const axA = svg.append("g").attr("class","axis").attr("transform","translate("+m.l+",0)")
    .style("opacity",0).call(d3.axisLeft(yAI).tickValues([0,1,2,3,4]).tickFormat(i=>AI.levels[i]));
  const axTitle = svg.append("text").attr("transform","rotate(-90)")
    .attr("x",-H/2).attr("y",16).attr("text-anchor","middle")
    .attr("fill",palette.muted).attr("font-size",12).text("AI-use frequency");

  // developer dots (start in AI-cadence positions)
  const dots = svg.append("g").selectAll("circle").data(nodes).join("circle")
    .attr("r",R).attr("fill",d=>colorOf(d.grp)).attr("fill-opacity",0.5)
    .attr("stroke",palette.inverse).attr("stroke-width",0.4).style("cursor","pointer")
    .attr("cx",d=>d.cx+d.aiOX).attr("cy",d=>d.aiY)
    .on("mousemove",(e,d)=>showTip(e,"<b>"+d.grp+"</b><br>salary "+fmt$(d.v)+"<br>AI use ≈ "+AI.levels[Math.round(Math.max(0,Math.min(4,d.ai)))]))
    .on("mouseleave",hideTip);

  // per-group median bar + label (moves between modes); static group labels
  const medG=svg.append("g"); const med={};
  groups.forEach(grp=>{
    const cx=x(grp);
    med[grp]={
      bar: medG.append("line").attr("x1",cx-46).attr("x2",cx+46).attr("stroke",palette.ink).attr("stroke-width",2.5),
      lab: medG.append("text").attr("x",cx).attr("text-anchor","middle").attr("fill",palette.ink).attr("font-size",12).attr("font-weight",700)
    };
    svg.append("text").attr("x",cx).attr("y",H-m.b+18).attr("text-anchor","middle").attr("fill",palette.muted).attr("font-size",12).text(grp);
    svg.append("text").attr("x",cx).attr("y",H-m.b+34).attr("text-anchor","middle").attr("fill","var(--red)").attr("font-size",11).text(threatByGroup[grp].n.toLocaleString()+" devs");
  });

  // dashed connector: starts at the LEFT Y-AXIS ($150K tick) then runs across the three
  // salary medians -> ties "medians ≈ $150K" straight to the axis (visibly flat in salary mode)
  const medLinePts = [{xx:m.l, yy:ySal(150000)}].concat(
    groups.map(g=>({xx:x(g), yy:ySal(threatByGroup[g].median_comp)})));
  const connector = svg.append("path").attr("fill","none")
    .attr("stroke",palette.ink).attr("stroke-width",1.5).attr("stroke-dasharray","5 4").attr("opacity",0)
    .attr("d", d3.line().x(d=>d.xx).y(d=>d.yy)(medLinePts));
  const flatNote = svg.append("text").attr("x",W-m.r-80).attr("y",ySal(150000)-14)
    .attr("fill",palette.ink).attr("font-size",16).attr("font-weight",700).attr("font-style","italic").attr("opacity",0).text("medians ≈ flat");

  // dynamic caption at top of plot
  const modeNote = svg.append("text").attr("x",W/2).attr("y",m.t-26).attr("text-anchor","middle")
    .attr("fill",palette.ink).attr("font-size",19).attr("font-weight",700);

  function setMode(mode, animate){
    const sal = mode==="salary";
    const dur = animate ? 950 : 0;
    // direct set when not animating (robust even where rAF/transitions don't run);
    // smooth transition only for the animated scroll morph.
    const sel = s => dur ? s.transition().duration(dur).ease(d3.easeCubicInOut) : s;
    sel(dots).attr("cx",d=>d.cx+(sal?d.salOX:d.aiOX)).attr("cy",d=>sal?d.salY:d.aiY);
    sel(axS).style("opacity",sal?1:0);
    sel(axA).style("opacity",sal?0:1);
    axTitle.text(sal?"Annual salary (USA, USD)":"AI-use frequency");
    groups.forEach(grp=>{
      const yPos = sal ? ySal(threatByGroup[grp].median_comp) : yAI(AI.meanByGroup[grp]);
      sel(med[grp].bar).attr("y1",yPos).attr("y2",yPos);
      sel(med[grp].lab).attr("y",yPos-8).text(sal?"":AI.levels[Math.round(AI.meanByGroup[grp])]);
    });
    sel(connector).attr("opacity",sal?0.6:0);
    sel(flatNote).attr("opacity",sal?0.85:0);
    modeNote.attr("font-size", sal ? 19 : 14).text(sal
      ? "Same pay, whatever the fear — the three medians sit level."
      : "The threatened use AI more, not less — "+AI.dailyShareByGroup["Feel threatened"]+"% use it daily vs "+AI.dailyShareByGroup["Not threatened"]+"% of the calm.");
  }
  window.__threatSetMode = setMode;

  d3.select("#gi-legend").html(
    '<span class="legend-item"><span class="swatch" style="background:var(--red)"></span>Feel threatened</span>' +
    '<span class="legend-item"><span class="swatch" style="background:' + palette.greenDark + '"></span>Not threatened</span>' +
    '<span class="legend-item"><span class="swatch" style="background:' + palette.slate + '"></span>Unsure</span>' +
    '<span class="legend-item" style="opacity:.8">Scroll: the Y axis morphs from AI-use frequency &rarr; salary.</span>'
  );

  setMode("ai", false);   // initial view = AI-use cadence
})();

// Source script block 2.
(function(){
  "use strict";
  // ---- inlined data: Q2_geo_gap_years (gap / pay / n per year) ----
  // ---- inlined data: q2_country (2025 median pay vs AI-daily adoption) ----
  const HIGH = palette.cyan, LOW = palette.orange, YEARS = ["2023","2024","2025"];
  const shortName = c => SHORT[c] || c;
  const fmtK = v => "$" + (v >= 1000 ? Math.round(v/1000) + "k" : Math.round(v));
  const signPct = v => (v > 0 ? "+" : "") + v + "%";

  const tip = d3.select("#tooltip");
  const showTip = (e,h)=>tip.html(h).style("left",e.clientX+"px").style("top",e.clientY+"px").classed("visible",true);
  const hideTip = ()=>tip.classed("visible",false);

  const W = 860, H = 520;
  const m = {top:30, right:34, bottom:78, left:62};
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;

  const svg = d3.select("#pay-svg");
  // shared plot origin
  const root = svg.append("g").attr("transform","translate("+m.left+","+m.top+")");

  // ======================================================================
  // VIEW A — Pay gap (animated bubble)
  // ======================================================================
  const gapLayer = root.append("g").attr("class","pay-layer");

  const allPay=[], allN=[], allGap=[];
  GAP.forEach(c=>YEARS.forEach(yy=>{ allPay.push(c.years[yy].pay); allN.push(c.years[yy].n); allGap.push(c.years[yy].gap); }));

  const gx = d3.scaleLog().domain([10000,160000]).range([0,iw]).clamp(true);
  const gy = d3.scaleLinear().domain([-45,60]).range([ih,0]);
  const gr = d3.scaleSqrt().domain([0,d3.max(allN)]).range([3,30]);

  // big faint year watermark (behind everything in this layer)
  const wm = gapLayer.append("text")
    .attr("x", iw - 6).attr("y", ih - 6)
    .attr("text-anchor","end")
    .attr("font-size", 130).attr("font-weight", 800)
    .attr("fill", palette.surfaceSoft)
    .text(YEARS[0]);

  // x gridlines at tick values
  const gxTicks = [10000,20000,40000,80000,160000];
  gapLayer.append("g").attr("class","grid")
    .selectAll("line").data(gxTicks).join("line")
    .attr("x1",d=>gx(d)).attr("x2",d=>gx(d)).attr("y1",0).attr("y2",ih);

  // x axis (log, dollars)
  gapLayer.append("g").attr("class","axis")
    .attr("transform","translate(0,"+ih+")")
    .call(d3.axisBottom(gx).tickValues(gxTicks).tickFormat(fmtK))
    .call(g=>g.select(".domain").remove());
  // y axis (gap %)
  gapLayer.append("g").attr("class","axis")
    .call(d3.axisLeft(gy).ticks(7).tickFormat(d=>(d>0?"+":"")+d+"%"))
    .call(g=>g.select(".domain").remove());

  // axis titles
  gapLayer.append("text")
    .attr("x", iw/2).attr("y", ih + 42)
    .attr("text-anchor","middle").attr("fill","var(--muted)")
    .attr("font-size",12.5).attr("font-weight",600)
    .text("Country's typical pay (log scale)");
  gapLayer.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -ih/2).attr("y", -46)
    .attr("text-anchor","middle").attr("fill","var(--muted)")
    .attr("font-size",12.5).attr("font-weight",600)
    .text("AI-user vs AI-never pay gap (%)");

  // parity line (dashed gray) at gap = 0
  gapLayer.append("line").attr("class","boundary-line")
    .attr("x1",0).attr("x2",iw)
    .attr("y1",gy(0)).attr("y2",gy(0))
    .attr("stroke",palette.slate).attr("stroke-width",1.5).attr("stroke-dasharray","6 4");
  gapLayer.append("text")
    .attr("x",4).attr("y",gy(0)-7)
    .attr("fill",palette.slate).attr("font-size",11.5).attr("font-weight",600)
    .text("parity — AI users earn the same");

  // top-right annotation: what "up" means
  gapLayer.append("text")
    .attr("x", iw).attr("y", 13).attr("text-anchor","end")
    .attr("fill",palette.greenDark).attr("font-size",12.5).attr("font-weight",800)
    .text("▲ above the line = AI users earn more");

  // bubbles (start at 2023)
  const bub = gapLayer.append("g").selectAll("circle.pay-bub")
    .data(GAP, d=>d.country).join("circle")
    .attr("class","pay-bub")
    .attr("fill", d=>d.tier==="high"?HIGH:LOW)
    .attr("fill-opacity",0.62)
    .attr("stroke",palette.inverse).attr("stroke-width",1)
    .style("cursor","pointer")
    .attr("cx", d=>gx(d.years["2023"].pay))
    .attr("cy", d=>gy(d.years["2023"].gap))
    .attr("r",  d=>gr(d.years["2023"].n))
    .on("mousemove",(e,d)=>{
      const v=d.years[YEARS[gapIdx]];
      showTip(e,"<b>"+shortName(d.country)+" · "+YEARS[gapIdx]+"</b><br>Pay "+fmtK(v.pay)+" · AI gap "+signPct(v.gap)+" · N="+v.n.toLocaleString());
    })
    .on("mouseleave", hideTip);

  // labels: ~6 biggest by 2025 #devs, plus always India & Ukraine
  const bigSet = new Set([...GAP].sort((a,b)=>b.years["2025"].n-a.years["2025"].n).slice(0,6).map(d=>d.country));
  bigSet.add("India"); bigSet.add("Ukraine");
  const labs = gapLayer.append("g").selectAll("text.pay-clab")
    .data(GAP.filter(d=>bigSet.has(d.country)), d=>d.country).join("text")
    .attr("class","pay-clab label")
    .attr("text-anchor","middle")
    .attr("font-size",11).attr("font-weight",600)
    .attr("fill","var(--ink)")
    .attr("paint-order","stroke").attr("stroke",palette.inverse).attr("stroke-width",2.6)
    .style("pointer-events","none")
    .text(d=>shortName(d.country));

  // annotation block under the gap chart (centered, pushed below the x-axis label)
  const annoG = gapLayer.append("text")
    .attr("x", iw/2).attr("y", ih + 72).attr("text-anchor","middle")
    .attr("font-size",12).attr("fill","var(--ink)");
  annoG.append("tspan").attr("x",iw/2).attr("dy",0).attr("font-weight",700)
    .text("Most countries sit ABOVE the line — AI users earn more — and 2023→2025 the gap grew in most");
  annoG.append("tspan").attr("x",iw/2).attr("dy",16).attr("font-weight",700)
    .text("(USA +0→+14%, India −28→+54%). A few fell below (Ukraine).");
  annoG.append("tspan").attr("x",iw/2).attr("dy",16).attr("font-weight",400).attr("fill","var(--muted)")
    .text("Caveat: AI-daily users also tend to be more experienced — a pattern, not proof of cause.");

  let gapIdx = 0;
  function renderGap(idx, animate){
    gapIdx = idx;
    const Y = YEARS[idx];
    const dur = animate ? 1100 : 0;
    const tt = d3.transition().duration(dur).ease(d3.easeCubicInOut);
    bub.transition(tt)
      .attr("cx", d=>gx(d.years[Y].pay))
      .attr("cy", d=>gy(d.years[Y].gap))
      .attr("r",  d=>gr(d.years[Y].n));
    labs.transition(tt)
      .attr("x", d=>gx(d.years[Y].pay))
      .attr("y", d=>gy(d.years[Y].gap))
      .attr("dy", d=>{ const rr=gr(d.years[Y].n); return rr>15 ? "0.32em" : (-rr-4); });
    wm.transition(tt).text(Y);
    const range = document.getElementById("pay-year-range");
    if (range) range.value = idx;
    const out = document.getElementById("pay-year-out");
    if (out) out.textContent = Y;
  }

  // ======================================================================
  // Controls: year chips (injected into #pay-controls), play, view pills
  // ======================================================================
  // build a year slider into the controls bar, next to play
  const yrWrap = d3.select("#pay-controls").append("span")
    .attr("id","pay-years").attr("class","year-slider");
  yrWrap.append("input")
    .attr("type","range").attr("id","pay-year-range")
    .attr("min",0).attr("max",YEARS.length-1).attr("step",1).attr("value",0)
    .attr("aria-label","Year")
    .on("input", function(){ stop(); renderGap(+this.value, true); });
  yrWrap.append("output").attr("id","pay-year-out").text(YEARS[0]);

  let playing=false, timer=null;
  function stop(){ playing=false; if(timer) clearTimeout(timer); timer=null; d3.select("#pay-play").text("▶ Play"); }
  function play(){
    if(gapIdx>=YEARS.length-1) renderGap(0,false);
    playing=true; d3.select("#pay-play").text("❚❚ Pause");
    const step=()=>{ if(!playing) return; if(gapIdx<YEARS.length-1){ renderGap(gapIdx+1,true); timer=setTimeout(step,1700);} else stop(); };
    timer=setTimeout(step,1200);
  }
  d3.select("#pay-play").on("click",()=>playing?stop():play());

  // legend content
  const legend = d3.select("#pay-legend");
  function setLegend(){
    legend.html(
      '<span class="legend-item"><span class="swatch" style="background:'+HIGH+'"></span>Higher-income country</span>'+
      '<span class="legend-item"><span class="swatch" style="background:'+LOW+'"></span>Lower-income country</span>'+
      '<span class="legend-item" style="color:var(--muted)">size = #developers</span>'+
      '<span class="legend-item" style="color:var(--muted)">"AI user" = uses AI tools (any frequency)</span>'
    );
  }

  // initial render: gap view, year 2023, no animation
  renderGap(0, false);
  setLegend("gap");
})();

// Source script block 3.
(function () {
  // ---- data (real Stack Overflow 2025; falls back to inlined copy if global absent) ----
  var FALLBACK = [
    { task: "Search for answers", now: 58.6, mostly: 20.0, planned: 25.1, refused: 16.3, n: 30378 },
    { task: "Writing code", now: 46.9, mostly: 6.2, planned: 29.1, refused: 24.0, n: 30530 },
    { task: "Learning new concepts or technologies", now: 45.3, mostly: 12.3, planned: 27.6, refused: 27.1, n: 30182 },
    { task: "Debugging or fixing code", now: 40.3, mostly: 7.6, planned: 29.3, refused: 30.4, n: 30311 },
    { task: "Generating content or synthetic data", now: 33.8, mostly: 13.5, planned: 33.7, refused: 32.5, n: 29753 },
    { task: "Documenting code", now: 32.6, mostly: 11.5, planned: 35.0, refused: 32.4, n: 30122 },
    { task: "Learning about a codebase", now: 30.7, mostly: 7.8, planned: 36.1, refused: 33.3, n: 30045 },
    { task: "Creating or maintaining documentation", now: 28.4, mostly: 9.3, planned: 38.0, refused: 33.5, n: 29975 },
    { task: "Testing code", now: 25.9, mostly: 6.7, planned: 37.0, refused: 37.2, n: 30123 },
    { task: "Committing and reviewing code", now: 19.7, mostly: 3.8, planned: 30.6, refused: 49.7, n: 29948 },
    { task: "Project planning", now: 16.1, mostly: 4.1, planned: 24.9, refused: 58.9, n: 29812 },
    { task: "Predictive analytics", now: 13.4, mostly: 4.2, planned: 29.5, refused: 57.1, n: 29134 },
    { task: "Deployment and monitoring", now: 9.7, mostly: 2.3, planned: 25.5, refused: 64.8, n: 29712 }
  ];
  var TASKS = ((window.INDEX_SCROLL_VERIFY_DATA || {}).TASKS) || FALLBACK;

  // ---- short labels for on-chart text ----
  var SHORT = {
    "Search for answers": "Search answers",
    "Writing code": "Writing code",
    "Learning new concepts or technologies": "Learning new tech",
    "Debugging or fixing code": "Debugging",
    "Generating content or synthetic data": "Generating content",
    "Documenting code": "Documenting code",
    "Learning about a codebase": "Learn a codebase",
    "Creating or maintaining documentation": "Maintaining docs",
    "Testing code": "Testing code",
    "Committing and reviewing code": "Commit & review",
    "Project planning": "Project planning",
    "Predictive analytics": "Predictive analytics",
    "Deployment and monitoring": "Deploy & monitor"
  };
  function short(t) { return SHORT[t] || t; }

  // ---- work-category map (task -> {cat,color}); colorblind-safe palette ----
  var CATS = [
    { cat: "Coding", color: palette.catCoding },
    { cat: "Quality", color: palette.catQuality },
    { cat: "Docs", color: palette.catDocs },
    { cat: "Learning", color: palette.catLearning },
    { cat: "Planning", color: palette.catPlanning },
    { cat: "Ops", color: palette.catOps }
  ];
  var CAT_COLOR = {};
  CATS.forEach(function (c) { CAT_COLOR[c.cat] = c.color; });
  var TASK_CAT = {
    "Writing code": "Coding",
    "Debugging or fixing code": "Coding",
    "Generating content or synthetic data": "Coding",
    "Testing code": "Quality",
    "Committing and reviewing code": "Quality",
    "Documenting code": "Docs",
    "Creating or maintaining documentation": "Docs",
    "Search for answers": "Learning",
    "Learning new concepts or technologies": "Learning",
    "Learning about a codebase": "Learning",
    "Project planning": "Planning",
    "Predictive analytics": "Planning",
    "Deployment and monitoring": "Ops"
  };
  var CAT = {};
  Object.keys(TASK_CAT).forEach(function (t) {
    var c = TASK_CAT[t];
    CAT[t] = { cat: c, color: CAT_COLOR[c] };
  });
  function catColor(t) { return (CAT[t] && CAT[t].color) || "var(--cyan)"; }

  // ---- metrics (short labels for the compact axis <select>s) ----
  var METRICS = {
    now: "AI use now",
    mostly: "Mostly delegate",
    planned: "Plan to use",
    refused: "Keep human"
  };
  var DETAIL_LABEL = {
    now: "Use AI now",
    mostly: "Mostly delegate",
    planned: "Plan to use",
    refused: "Keep human"
  };
  var KEYS = ["now", "mostly", "planned", "refused"];

  var xKey = "now", yKey = "mostly", selected = null, highlight = null;
  // true when task d is part of the active scroll highlight set
  function inHi(d) { return highlight && highlight.indexOf(d.task) !== -1; }

  // ---- selects ----
  var xSel = document.getElementById("vf-xsel");
  var ySel = document.getElementById("vf-ysel");
  function optionsHtml() {
    return KEYS.map(function (k) {
      return '<option value="' + k + '">' + METRICS[k] + '</option>';
    }).join("");
  }
  xSel.innerHTML = optionsHtml();
  ySel.innerHTML = optionsHtml();
  xSel.value = xKey;
  ySel.value = yKey;
  xSel.addEventListener("change", function () { xKey = this.value; render(true); });
  ySel.addEventListener("change", function () { yKey = this.value; render(true); });

  // ---- svg scaffold ----
  var W = 640, H = 470, M = { top: 22, right: 24, bottom: 50, left: 56 };
  var iW = W - M.left - M.right, iH = H - M.top - M.bottom;
  var svg = d3.select("#vf-svg");
  var g = svg.append("g").attr("transform", "translate(" + M.left + "," + M.top + ")");
  var gGrid = g.append("g").attr("class", "grid");
  var gMed = g.append("g");
  var gCorner = g.append("g");
  var gDots = g.append("g");
  var gLead = g.append("g");
  var gLab = g.append("g");
  var gx = g.append("g").attr("class", "axis").attr("transform", "translate(0," + iH + ")");
  var gy = g.append("g").attr("class", "axis");
  var xTitle = g.append("text")
    .attr("text-anchor", "middle").attr("x", iW / 2).attr("y", iH + 40)
    .attr("fill", palette.text).style("font-size", "12px").style("font-weight", "900");
  var yTitle = g.append("text")
    .attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("x", -iH / 2).attr("y", -42)
    .attr("fill", palette.text).style("font-size", "12px").style("font-weight", "900");

  var tip = d3.select("#tooltip");

  function pad(arr) {
    var lo = d3.min(arr), hi = d3.max(arr);
    var p = (hi - lo) * 0.12 || 1;
    return [lo - p, hi + p];
  }

  function render(animate) {
    var dur = animate ? 600 : 0;
    var xv = TASKS.map(function (d) { return d[xKey]; });
    var yv = TASKS.map(function (d) { return d[yKey]; });
    var xd = pad(xv), yd = pad(yv);
    var x = d3.scaleLinear().domain(xd).range([0, iW]);
    var y = d3.scaleLinear().domain(yd).range([iH, 0]);

    // axes
    gx.transition().duration(dur).call(d3.axisBottom(x).ticks(6).tickSize(6).tickPadding(6));
    gy.transition().duration(dur).call(d3.axisLeft(y).ticks(6).tickSize(6).tickPadding(6));
    // grid
    gGrid.selectAll(".gx").data([0]).join("g").attr("class", "gx").attr("transform", "translate(0," + iH + ")")
      .transition().duration(dur).call(d3.axisBottom(x).ticks(6).tickSize(-iH).tickFormat(""));
    gGrid.selectAll(".gy").data([0]).join("g").attr("class", "gy")
      .transition().duration(dur).call(d3.axisLeft(y).ticks(6).tickSize(-iW).tickFormat(""));

    xTitle.text(METRICS[xKey] + " →");
    yTitle.text(METRICS[yKey] + " →");

    // median crosshair
    var xMed = d3.median(TASKS, function (d) { return d[xKey]; });
    var yMed = d3.median(TASKS, function (d) { return d[yKey]; });
    var mx = x(xMed), my = y(yMed);
    gMed.selectAll("line.vf-med-v").data([0]).join(
      function (e) { return e.append("line").attr("class", "vf-med-v"); }, function (u) { return u; }
    ).attr("stroke", palette.slate).attr("stroke-dasharray", "5 6").attr("stroke-width", 1.2)
      .transition().duration(dur).attr("x1", mx).attr("x2", mx).attr("y1", 0).attr("y2", iH);
    gMed.selectAll("line.vf-med-h").data([0]).join(
      function (e) { return e.append("line").attr("class", "vf-med-h"); }, function (u) { return u; }
    ).attr("stroke", palette.slate).attr("stroke-dasharray", "5 6").attr("stroke-width", 1.2)
      .transition().duration(dur).attr("x1", 0).attr("x2", iW).attr("y1", my).attr("y2", my);

    // subtle corner annotations (describe the default now x mostly reading)
    gCorner.selectAll("*").remove();
    gCorner.append("text").attr("x", iW - 4).attr("y", 14).attr("text-anchor", "end")
      .attr("fill", palette.slate).style("font-size", "11px").style("font-weight", "900").style("opacity", 0.7)
      .text("▲ AI takes it");
    gCorner.append("text").attr("x", 4).attr("y", iH - 6).attr("text-anchor", "start")
      .attr("fill", palette.slate).style("font-size", "11px").style("font-weight", "900").style("opacity", 0.7)
      .text("▼ humans keep it");

    // dot radius encodes # respondents (n); subtle since n is near-uniform
    var rScale = d3.scaleSqrt().domain(d3.extent(TASKS, function (d) { return d.n; })).range([6, 13]);
    function rOf(d) { return rScale(d.n); }

    // dots (colored by work-category)
    var dots = gDots.selectAll("circle.dot").data(TASKS, function (d) { return d.task; });
    dots.enter().append("circle").attr("class", "dot")
      .attr("cx", function (d) { return x(d[xKey]); })
      .attr("cy", function (d) { return y(d[yKey]); })
      .attr("r", rOf)
      .attr("fill", function (d) { return catColor(d.task); })
      .attr("stroke", palette.inverse).attr("stroke-width", 1.4)
      .on("mouseover", onOver).on("mousemove", onMove).on("mouseout", onOut)
      .on("click", function (e, d) { e.stopPropagation(); toggle(d); })
      .merge(dots)
      .attr("fill", function (d) { return catColor(d.task); })
      .transition().duration(dur)
      .attr("cx", function (d) { return x(d[xKey]); })
      .attr("cy", function (d) { return y(d[yKey]); })
      .attr("r", rOf)
      .attr("fill-opacity", function (d) {
        if (selected) return d.task === selected ? 0.95 : 0.2;
        if (highlight) return inHi(d) ? 0.95 : 0.12;
        return 0.8;
      })
      .attr("stroke-opacity", function (d) {
        if (selected) return d.task === selected ? 1 : 0.2;
        if (highlight) return inHi(d) ? 1 : 0.2;
        return 1;
      })
      .attr("stroke-width", function (d) {
        if (d.task === selected) return 2;
        if (highlight && inHi(d)) return 2.4;
        return 1.4;
      });

    // labels: candidate-position placement. Try 8 spots snug around the dot
    // (right/left/top/bottom + 4 diagonals) — first free one wins, NO leader.
    // Only when every adjacent spot is blocked does the label spiral out to free
    // space WITH a leader. "free" = overlaps NO dot and NO already-placed label
    // (strictly zero overlap). Recomputed each render.
    var FS = 10.5, PADX = 3, PADY = 2, OFF = 4;
    gLab.selectAll("*").remove();
    gLead.selectAll("*").remove();
    var LB = TASKS.map(function (d) { return { d: d, tx: x(d[xKey]), ty: y(d[yKey]), r: rOf(d) }; });
    LB.forEach(function (o) {
      var t = gLab.append("text").attr("class", "label")
        .style("pointer-events", "none").style("font-size", FS + "px")
        .style("opacity", selected ? (o.d.task === selected ? 1 : 0.22) : (highlight ? (inHi(o.d) ? 1 : 0.18) : 1))
        .attr("text-anchor", "middle").text(short(o.d.task));
      o.node = t.node();
      var bb = o.node.getBBox();
      o.hw = bb.width / 2 + PADX; o.hh = bb.height / 2 + PADY;
    });
    var placed = [];
    // these labels always get a leader (association is otherwise ambiguous)
    var FORCE_LEAD = { "Project planning": 1, "Learning about a codebase": 1, "Documenting code": 1, "Testing code": 1 };
    function boxAt(o, cx, cy) { return { x0: cx - o.hw, y0: cy - o.hh, x1: cx + o.hw, y1: cy + o.hh }; }
    function rOver(a, b) { return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1; }
    function hitsDot(box, cx, cy, cr) {
      var nx = Math.max(box.x0, Math.min(cx, box.x1)), ny = Math.max(box.y0, Math.min(cy, box.y1));
      return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < (cr + 1) * (cr + 1);
    }
    function free(o, cx, cy) {
      var box = boxAt(o, cx, cy), k;
      if (box.x0 < 0 || box.x1 > iW || box.y0 < 1 || box.y1 > iH - 1) return false;
      for (k = 0; k < placed.length; k++) if (rOver(box, placed[k])) return false;
      for (k = 0; k < LB.length; k++) if (hitsDot(box, LB[k].tx, LB[k].ty, LB[k].r)) return false;
      return true;
    }
    LB.forEach(function (o) {
      var dx = o.r + OFF + o.hw, dy = o.r + OFF + o.hh, chosen = null, c;
      var cands = [
        [o.tx + dx, o.ty], [o.tx + dx, o.ty - dy], [o.tx + dx, o.ty + dy],
        [o.tx - dx, o.ty], [o.tx - dx, o.ty - dy], [o.tx - dx, o.ty + dy],
        [o.tx, o.ty - dy], [o.tx, o.ty + dy]
      ];
      for (c = 0; c < cands.length && !chosen; c++)
        if (free(o, cands[c][0], cands[c][1])) chosen = { x: cands[c][0], y: cands[c][1], lead: false };
      if (!chosen) {                                   // crowded: spiral outward, with a leader
        for (var dist = o.r + 24; dist <= 180 && !chosen; dist += 11)
          for (var a = 0; a < 16 && !chosen; a++) {
            var ang = a * Math.PI / 8, sx = o.tx + Math.cos(ang) * dist, sy = o.ty + Math.sin(ang) * dist;
            if (free(o, sx, sy)) chosen = { x: sx, y: sy, lead: true };
          }
        if (!chosen) chosen = { x: cands[0][0], y: cands[0][1], lead: true };
      }
      o.fx = chosen.x; o.fy = chosen.y; o.lead = chosen.lead || !!FORCE_LEAD[o.d.task];
      placed.push(boxAt(o, o.fx, o.fy));
      d3.select(o.node).attr("x", o.fx).attr("y", o.fy + FS * 0.34);
    });
    LB.forEach(function (o) {                          // leaders for displaced or explicitly-flagged labels
      if (!o.lead) return;
      var ex = Math.max(o.fx - o.hw, Math.min(o.tx, o.fx + o.hw));
      var ey = Math.max(o.fy - o.hh, Math.min(o.ty, o.fy + o.hh));
      var vx = ex - o.tx, vy = ey - o.ty, m = Math.hypot(vx, vy) || 1;   // start at the dot's edge
      gLead.append("line").attr("x1", o.tx + vx / m * o.r).attr("y1", o.ty + vy / m * o.r).attr("x2", ex).attr("y2", ey)
        .attr("stroke", palette.muted).attr("stroke-width", 1.1)
        .style("opacity", selected ? (o.d.task === selected ? 0.95 : 0.18) : (highlight ? (inHi(o.d) ? 0.95 : 0.15) : 0.9));
    });
  }

  function onOver(e, d) {
    tip.html(
      "<strong style='display:block;margin-bottom:3px'>" + short(d.task) + "</strong>" +
      KEYS.map(function (k) { return DETAIL_LABEL[k] + ": " + d[k].toFixed(1) + "%"; }).join("<br>")
    ).classed("visible", true);
    move(e);
  }
  function onMove(e) { move(e); }
  function onOut() { tip.classed("visible", false); }
  function move(e) {
    tip.style("left", (e.clientX) + "px").style("top", (e.clientY) + "px");
  }

  // ---- detail panel ----
  var detail = document.getElementById("vf-detail");
  function emptyDetail() {
    detail.innerHTML = '<div style="color:var(--muted);font-size:12px;font-weight:800;text-align:center;padding:60px 8px">Click a task for its breakdown.</div>';
  }
  function showDetail(d) {
    var rows = KEYS.map(function (k) {
      return '<div style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">' +
        '<span style="font-size:11px;color:var(--text-soft);font-weight:900">' + DETAIL_LABEL[k] + '</span>' +
        '<span style="font-size:12px;color:var(--ink);font-weight:900;font-variant-numeric:tabular-nums">' + d[k].toFixed(1) + '%</span>' +
        '</div>' +
        '<div style="height:8px;border-radius:999px;background:var(--surface-soft);overflow:hidden">' +
        '<div class="vf-fill" data-pct="' + d[k] + '" style="height:100%;width:0%;border-radius:999px;background:var(--night);transition:width .5s ease"></div>' +
        '</div>' +
        '</div>';
    }).join("");
    detail.innerHTML =
      '<div style="font-size:14px;color:var(--ink);font-weight:900;margin-bottom:12px">' + short(d.task) + '</div>' +
      rows;
    // animate fills on next frame
    var fills = detail.querySelectorAll(".vf-fill");
    requestAnimationFrame(function () {
      fills.forEach(function (el) {
        var pct = Math.max(0, Math.min(100, parseFloat(el.getAttribute("data-pct"))));
        el.style.width = pct + "%";
      });
    });
  }
  function toggle(d) {
    if (selected === d.task) { selected = null; emptyDetail(); }
    else { selected = d.task; showDetail(d); }
    render(false);
  }

  // click empty space clears
  svg.on("click", function (e) {
    if (e.target === svg.node() || e.target === g.node()) {
      if (selected) { selected = null; emptyDetail(); render(false); }
    }
  });

  // ---- category legend (+ a size note) inside the viz-card ----
  function buildLegend() {
    var el = document.getElementById("vf-legend");
    if (!el) return;
    var html = CATS.map(function (c) {
      return '<span class="legend-item">' +
        '<span class="swatch" style="background:' + c.color + '"></span>' + c.cat +
        '</span>';
    }).join("");
    html += '<span class="legend-item">' +
      '<span class="swatch" style="background:' + palette.slate + '"></span>dot size = # respondents' +
      '</span>';
    el.innerHTML = html;
  }

  // ---- scroll highlight: emphasize a set of tasks, fade the rest ----
  // Driven by the ACT 3 scrollytelling steps via window.__verifySetHighlight.
  window.__verifySetHighlight = function (tasks) {
    highlight = tasks && tasks.length ? tasks : null;
    render(true);
  };

  // ---- init ----
  buildLegend();
  emptyDetail();
  render(false);
})();

// Source script block 4.
const tip = d3.select("#tooltip");
const showTip = (event, html) => {
  tip.html(html).style("left", `${event.clientX}px`).style("top", `${event.clientY}px`).classed("visible", true);
};
const hideTip = () => tip.classed("visible", false);

const state = {
  persona: "seeker",
  developerMode: "role",
  seniority: "all",
  skillFilter: "all",
  clusterFilter: "all",
  weights: { pop: 35, growth: 40, ai: 25 },
  redrafted: false
};
const navLinks = [...document.querySelectorAll(".nav a")];
const sections = navLinks.map(link => document.querySelector(link.getAttribute("href")));
const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-35% 0px -55% 0px" });
sections.forEach(section => navObserver.observe(section));

// Scene 4: AIOpen text clustering result from the clustered open-ended response pipeline.
const clusterData = window.AIOPEN_CLUSTER_DATA;
const clusterPalette = {
  problem: palette.catProblem,
  design: palette.catDesign,
  comm: palette.catComm,
  domain: palette.catDomain,
  fund: palette.catFund,
  ai: palette.catAi,
  adapt: palette.catAdapt
};
const clusterCats = (clusterData?.cats || [
  { id: "problem", name: "Problem Solving" },
  { id: "design", name: "System Design" },
  { id: "comm", name: "Communication" },
  { id: "domain", name: "Domain Sense" },
  { id: "fund", name: "CS Fundamentals" },
  { id: "ai", name: "AI Fluency" },
  { id: "adapt", name: "Adaptability" }
]).map(cat => ({ ...cat, color: clusterPalette[cat.id] || palette.muted }));
const clusterCatById = Object.fromEntries(clusterCats.map(d => [d.id, d]));
const clusterSubs = (clusterData?.subs || []).slice()
  .sort((a, b) => b.count - a.count)
  .slice(0, 30)
  .map(d => ({
    ...d,
    color: clusterCatById[d.cat]?.color || palette.muted,
    catName: clusterCatById[d.cat]?.name || "Cluster",
    seniorShare: d.expW ? (d.expW[3] || 0) + (d.expW[4] || 0) : .45,
    juniorShare: d.expW ? (d.expW[0] || 0) + (d.expW[1] || 0) : .2
  }));
const clusterSvg = d3.select("#cluster-bubbles");
const clusterW = 860, clusterH = 620;
const clusterRadius = d3.scaleSqrt()
  .domain(d3.extent(clusterSubs, d => d.count))
  .range([12, 48]);
const clusterGroup = clusterSvg.append("g");
const clusterLayout = {
  problem: { x: 420, y: 205, labelX: 300, labelY: 92 },
  design: { x: 622, y: 236, labelX: 690, labelY: 138 },
  comm: { x: 640, y: 382, labelX: 720, labelY: 438 },
  domain: { x: 512, y: 468, labelX: 556, labelY: 558 },
  fund: { x: 306, y: 456, labelX: 210, labelY: 558 },
  ai: { x: 202, y: 362, labelX: 56, labelY: 396 },
  adapt: { x: 230, y: 220, labelX: 120, labelY: 178 }
};
clusterCats.forEach((cat, i) => {
  const angle = i / clusterCats.length * Math.PI * 2 - Math.PI / 2;
  const layout = clusterLayout[cat.id] || {
    x: clusterW / 2 + Math.cos(angle) * 260,
    y: clusterH / 2 + Math.sin(angle) * 210
  };
  cat.anchorX = layout.x;
  cat.anchorY = layout.y;
  cat.labelX = layout.labelX || layout.x + Math.cos(angle) * 92;
  cat.labelY = layout.labelY || layout.y + Math.sin(angle) * 92;
});
const mainProblemCluster = d3.greatest(
  clusterSubs.filter(d => d.cat === "problem"),
  d => d.count
);
const clusterNodes = clusterSubs.map((d, i) => {
  const cat = clusterCatById[d.cat] || { anchorX: clusterW / 2, anchorY: clusterH / 2 };
  const siblings = clusterSubs.filter(s => s.cat === d.cat);
  const localIndex = siblings.findIndex(s => s.id === d.id);
  const angle = localIndex / Math.max(1, siblings.length) * Math.PI * 2 + (i % 2 ? .24 : -.18);
  const distance = 34 + (localIndex % 4) * 18 + clusterRadius(d.count) * .34;
  const isMainProblem = d.id === mainProblemCluster?.id;
  return {
    ...d,
    x: isMainProblem ? cat.anchorX : cat.anchorX + Math.cos(angle) * distance,
    y: isMainProblem ? cat.anchorY : cat.anchorY + Math.sin(angle) * distance,
    fx: isMainProblem ? cat.anchorX : null,
    fy: isMainProblem ? cat.anchorY : null,
    r: clusterRadius(d.count),
    isMainProblem
  };
});
const clusterHullLayer = clusterGroup.append("g").attr("class", "cluster-hull-layer");
const clusterNodeLayer = clusterGroup.append("g").attr("class", "cluster-node-layer");
const clusterLabelLayer = clusterGroup.append("g").attr("class", "cluster-label-layer");
function clusterHull(cat) {
  const nodes = clusterNodes.filter(d => d.cat === cat.id);
  if (!nodes.length) {
    return { ...cat, x: cat.anchorX, y: cat.anchorY, r: 0 };
  }
  const x = d3.mean(nodes, d => d.x);
  const y = d3.mean(nodes, d => d.y);
  const r = d3.max(nodes, d => Math.hypot(d.x - x, d.y - y) + d.r + 12);
  return { ...cat, x, y, r };
}
const clusterHulls = clusterHullLayer.selectAll(".cluster-hull")
  .data(clusterCats, d => d.id)
  .join("circle")
  .attr("class", "cluster-hull")
  .attr("fill", d => d.color)
  .attr("stroke", d => d.color)
  .on("mouseenter", (event, d) => {
    pulseClusterHull(d.id, true);
    clusterSimulation.alphaTarget(.04).restart();
  })
  .on("mouseleave", (event, d) => {
    pulseClusterHull(d.id, false);
    clusterSimulation.alphaTarget(0);
  });
clusterSvg.append("g")
  .selectAll("text")
  .data(clusterCats)
  .join("text")
  .attr("class", "cluster-category-label")
  .attr("x", d => d.labelX)
  .attr("y", d => d.labelY)
  .style("fill", d => d.color)
  .text(d => d.name);
const clusterSimulation = d3.forceSimulation(clusterNodes)
  .force("charge", d3.forceManyBody().strength(-28))
  .force("collide", d3.forceCollide(d => d.r + 9))
  .force("x", d3.forceX(d => clusterCatById[d.cat]?.anchorX || clusterW / 2).strength(.22))
  .force("y", d3.forceY(d => clusterCatById[d.cat]?.anchorY || clusterH / 2).strength(.22))
  .on("tick", () => {
    clusterHulls
      .each(function(d) {
        const hull = clusterHull(d);
        d3.select(this)
          .attr("cx", hull.x)
          .attr("cy", hull.y)
          .attr("r", hull.r * (d.hullScale || 1));
      });
    clusterCircles.attr("cx", d => d.x).attr("cy", d => d.y);
    clusterLabels.attr("x", d => d.x).attr("y", d => d.y + 4);
  });
function nudgeCluster(d) {
  clusterNodes.forEach(node => {
    if (node === d || node.cat !== d.cat) return;
    const dx = node.x - d.x;
    const dy = node.y - d.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    node.vx += dx / dist * .45;
    node.vy += dy / dist * .45;
  });
  clusterSimulation.alphaTarget(.08).restart();
}
function pulseClusterHull(catId, active) {
  clusterHulls
    .filter(d => d.id === catId)
    .transition()
    .duration(active ? 170 : 420)
    .ease(active ? d3.easeBackOut.overshoot(1.5) : d3.easeElasticOut.amplitude(.55).period(.48))
    .tween("hull-scale", function(d) {
      const node = d3.select(this);
      const scale = d3.interpolateNumber(d.hullScale || 1, active ? 1.045 : 1);
      return t => {
        d.hullScale = scale(t);
        const hull = clusterHull(d);
        node
          .attr("cx", hull.x)
          .attr("cy", hull.y)
          .attr("r", hull.r * d.hullScale);
      };
    });
}
const clusterCircles = clusterNodeLayer.selectAll("circle").data(clusterNodes, d => d.id).join("circle")
  .attr("class", "cluster-bubble")
  .attr("r", d => d.r)
  .attr("fill", d => d.color)
  .attr("fill-opacity", .72)
  .attr("stroke", palette.ink)
  .attr("stroke-width", 1.4)
  .on("mouseenter", (event, d) => {
    nudgeCluster(d);
    pulseClusterHull(d.cat, true);
    d3.select(event.currentTarget)
      .raise()
      .transition()
      .duration(180)
      .ease(d3.easeBackOut.overshoot(1.7))
      .attr("r", d.r * 1.09)
      .attr("fill-opacity", .86)
      .attr("stroke-width", 2.4);
  })
  .on("mousemove", (event, d) => {
    const terms = (d.terms || []).slice(0, 5).join(", ");
    const quote = d.quotes?.[0]?.t ? d.quotes[0].t.slice(0, 180) + (d.quotes[0].t.length > 180 ? "..." : "") : "";
    showTip(event, `<b>${d.name}</b><br>${d.catName} · ${d3.format(",")(d.count)} mentions<br>${terms}<br><br>${quote}`);
  })
  .on("mouseleave", (event, d) => {
    hideTip();
    pulseClusterHull(d.cat, false);
    clusterSimulation.alphaTarget(0);
    d3.select(event.currentTarget)
      .transition()
      .duration(260)
      .ease(d3.easeElasticOut.amplitude(.7).period(.45))
      .attr("r", d.r)
      .attr("fill-opacity", .72)
      .attr("stroke-width", 1.4);
  })
  .call(d3.drag()
    .on("start", (event, d) => {
      if (!event.active) clusterSimulation.alphaTarget(.12).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) clusterSimulation.alphaTarget(0);
      d.fx = d.isMainProblem ? clusterCatById[d.cat]?.anchorX : null;
      d.fy = d.isMainProblem ? clusterCatById[d.cat]?.anchorY : null;
    }));
const clusterLabels = clusterLabelLayer.selectAll(".cluster-label").data(clusterNodes, d => d.id).join("text")
  .attr("class", "cluster-label")
  .text(d => d3.format(",")(d.count));
function renderClusters() {
  const filter = state.clusterFilter === "all"
    ? (state.persona === "senior" ? "senior" : state.persona === "junior" ? "junior" : "all")
    : state.clusterFilter;
  const clusterActive = cat => {
    const nodes = clusterNodes.filter(d => d.cat === cat.id);
    if (filter === "senior") return d3.mean(nodes, d => d.seniorShare) >= .52;
    if (filter === "junior") return d3.mean(nodes, d => d.juniorShare) >= .18;
    return true;
  };
  clusterHulls.transition().duration(450).attr("opacity", d => clusterActive(d) ? 1 : .18);
  clusterCircles.transition().duration(450)
    .attr("opacity", d => {
      if (filter === "senior") return d.seniorShare >= .52 ? 1 : .2;
      if (filter === "junior") return d.juniorShare >= .18 ? 1 : .2;
      return 1;
    })
    .attr("stroke-width", d => {
      if (filter === "senior") return d.seniorShare >= .52 ? 2.6 : 1;
      if (filter === "junior") return d.juniorShare >= .18 ? 2.6 : 1;
      return 1.4;
    });
  clusterLabels.transition().duration(450).attr("opacity", d => {
    if (filter === "senior") return d.seniorShare >= .52 ? 1 : .18;
    if (filter === "junior") return d.juniorShare >= .18 ? 1 : .18;
    return 1;
  });
}
document.querySelectorAll("#cluster-controls .pill").forEach(button => {
  button.addEventListener("click", () => {
    state.clusterFilter = button.dataset.clusterFilter;
    document.querySelectorAll("#cluster-controls .pill").forEach(b => b.classList.toggle("active", b === button));
    renderClusters();
  });
});


// Scene 5: Integrated skill redraft conclusion.
const maxSkill = {
  usage: d3.max(languageSkills, d => d.usage),
  growth: d3.max(languageSkills, d => d.growth),
  ai: 100
};
const originalBoard = [...languageSkills].sort((a,b) => b.usage - a.usage).map((d, i) => ({ ...d, original: i + 1 }));
function logo(d) {
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${d.slug}/${d.slug}-original.svg`;
}
function personaName() {
  return state.persona === "seeker" ? "Job Seeker" : state.persona === "junior" ? "Junior" : "Senior";
}
function syncWeightControls() {
  const labels = {
    seeker: "Job Seeker preset: demand and momentum are weighted slightly higher.",
    junior: "Junior preset: AI fit carries more weight, but momentum still matters.",
    senior: "Senior preset: AI fit dominates because judgment and leverage compound."
  };
  [
    ["pop", "weight-pop"],
    ["growth", "weight-growth"],
    ["ai", "weight-ai"]
  ].forEach(([key, id]) => {
    document.getElementById(id).value = state.weights[key];
    document.getElementById(`${id}-value`).value = state.weights[key];
  });
  document.getElementById("weight-note").textContent = labels[state.persona];
}
function scoreSkill(d) {
  const w = state.weights;
  const total = Math.max(1, w.pop + w.growth + w.ai);
  return (w.pop * d.usage / maxSkill.usage + w.growth * d.growth / maxSkill.growth + w.ai * d.ai / maxSkill.ai) / total * 100;
}
function card(skill, rank, meta, score, move) {
  const moveClass = move > 0 ? "up" : move < 0 ? "down" : "";
  const moveText = move > 0 ? `+${move}` : move < 0 ? `${move}` : "0";
  return `<div class="skill-card ${move !== 0 ? "changed" : ""}" data-skill="${skill.name}" style="top:${(rank - 1) * 43}px">
    <div class="rank">${rank}</div>
    <img src="${logo(skill)}" alt="">
    <div><div class="skill-name">${skill.name}</div><div class="skill-meta">${meta}</div></div>
    <div class="score-strip"><div class="score-fill" style="width:${score}%"></div></div>
    <div class="move-badge ${moveClass}">${moveText}</div>
  </div>`;
}
function renderSkillList(items) {
  const el = document.getElementById("skill-board");
  const existing = new Map([...el.querySelectorAll(".skill-card")].map(card => [card.dataset.skill, card]));
  items.forEach(d => {
    let node = existing.get(d.name);
    if (!node) {
      el.insertAdjacentHTML("beforeend", card(d, d.rank, d.meta, d.score, d.move));
      node = el.querySelector(`.skill-card[data-skill="${CSS.escape(d.name)}"]`);
    }
    node.style.top = `${(d.rank - 1) * 43}px`;
    // Keep the rising card stacked above the others while it slides past them.
    node.style.zIndex = String(100 - d.rank);
    node.classList.toggle("changed", d.move !== 0);
    node.querySelector(".rank").textContent = d.rank;
    node.querySelector(".skill-meta").textContent = d.meta;
    node.querySelector(".score-fill").style.width = `${d.score}%`;
    const badge = node.querySelector(".move-badge");
    badge.textContent = d.move > 0 ? `+${d.move}` : d.move < 0 ? `${d.move}` : "0";
    badge.classList.toggle("up", d.move > 0);
    badge.classList.toggle("down", d.move < 0);
  });
  // NOTE: do NOT reorder the cards in the DOM here. Cards are positioned purely
  // by their absolute `top`, so DOM order is visually irrelevant — and calling
  // appendChild() on an already-attached node re-inserts it, which cancels its
  // in-flight CSS `top` transition and makes the rank change snap (flicker)
  // instead of animating. Stacking is handled by z-index above.
}
function renderRedraft() {
  const scored = originalBoard.map(d => ({ ...d, score: scoreSkill(d) })).sort((a,b) => b.score - a.score).map((d, i) => ({ ...d, redraft: i + 1 }));
  const scoredByName = Object.fromEntries(scored.map(d => [d.name, d]));
  const items = state.redrafted ? scored.map(d => {
    const move = d.original - d.redraft;
    const label = move > 0 ? `climbs ${move}` : move < 0 ? `falls ${Math.abs(move)}` : "holds";
    return { ...d, rank: d.redraft, meta: `${label} · score ${Math.round(d.score)}`, score: Math.round(d.score), move };
  }) : originalBoard.map(d => {
    const scoredItem = scoredByName[d.name];
    return { ...d, rank: d.original, meta: `${d.usage}% used · redraft score ${Math.round(scoredItem.score)}`, score: Math.round(scoredItem.score), move: 0 };
  });
  renderSkillList(items);
  document.getElementById("redraft-title").textContent = state.redrafted ? "Skill ranking · AI-era preparation" : "Skill ranking · current popularity";
  document.getElementById("board-label").textContent = state.redrafted ? "AI-era ranking" : "Current popularity";
  document.getElementById("persona-label").textContent = state.redrafted
    ? `${personaName()} · ${state.weights.pop}/${state.weights.growth}/${state.weights.ai}`
    : "SO 2025";
}
["pop", "growth", "ai"].forEach(key => {
  const input = document.getElementById(`weight-${key}`);
  input.addEventListener("input", () => {
    // Sliders only stage new weights — the board does not change until the
    // Redraft button is pressed. Just update the weight readout + note.
    state.weights[key] = Number(input.value);
    document.getElementById(`weight-${key}-value`).value = state.weights[key];
    document.getElementById("weight-note").textContent = `Custom ${personaName()} weights: popularity ${state.weights.pop}, momentum ${state.weights.growth}, AI fit ${state.weights.ai}.`;
  });
});
document.getElementById("redraft-button").addEventListener("click", () => {
  // Apply the staged slider weights with a single render. Cards keep their
  // identity across renders, so changing each card's `top` animates it from
  // its current spot to the new ranking via the CSS transition — no snap-back
  // double render, which previously read as a flicker.
  state.redrafted = true;
  document.getElementById("redraft-button").textContent = "Redraft Again";
  renderRedraft();
});

function varColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

renderClusters();
syncWeightControls();
renderRedraft();

// Scrollytelling controller.
(function () {
  // fire helpers — click the chart's EXISTING controls so no chart code changes
  const click = (sel) => {
    const el = document.querySelector(sel);
    if (el) el.click();
  };
  // Per-scene step config. Step 0 reuses the scene's original prompt text.
  const CFG = {
    threat: [
      { fire: () => window.__threatSetMode && window.__threatSetMode("ai", true) },
      {
        html: '<div class="micro"><b>Fear is not retreat.</b> The threatened reach for AI <b>more</b> — 49% use it daily vs 40% of the calm. Their cloud sits highest on this axis.</div>',
        fire: () => window.__threatSetMode && window.__threatSetMode("ai", true),
      },
      {
        html: '<div class="micro"><b>But it never reaches their pay.</b> Swap the Y axis to salary and the clouds fall into line — within one country, threatened and calm land at the same ~$150K. The fear is psychological, not financial.</div>',
        fire: () => window.__threatSetMode && window.__threatSetMode("salary", true),
      },
    ],
    // ACT 2 (the "pay" scene) is intentionally excluded from scrollytelling:
    // its animation is driven only by the ▶ Play button in the chart.
    verify: [
      { fire: () => window.__verifySetHighlight && window.__verifySetHighlight(null) },
      {
        html: '<div class="micro"><b>AI takes the routine.</b> Search, writing, and debugging sit top-right \u2014 high use, high delegation.</div>',
        fire: () => window.__verifySetHighlight && window.__verifySetHighlight([
          "Search for answers", "Writing code", "Debugging or fixing code"
        ]),
      },
      {
        html: '<div class="micro"><b>Humans keep the judgment.</b> Project planning, review, and deployment stay bottom-left \u2014 the work AI cannot take.</div>',
        fire: () => window.__verifySetHighlight && window.__verifySetHighlight([
          "Project planning", "Committing and reviewing code", "Deployment and monitoring"
        ]),
      },
    ],
    clusters: [
      { fire: () => click('#clusters [data-cluster-filter="all"]') },
      {
        html: '<div class="micro"><b>Juniors</b> name fundamentals and debugging — the practice they can’t skip.</div>',
        fire: () => click('#clusters [data-cluster-filter="junior"]'),
      },
      {
        html: '<div class="micro"><b>Seniors</b> name architecture, judgment, and mentoring — the skills that price AI output.</div>',
        fire: () => click('#clusters [data-cluster-filter="senior"]'),
      },
    ],
    // The "next" (Redraft) scene is intentionally excluded from scrollytelling:
    // its board is driven only by the left-side weight sliders and Redraft button.
  };

  const stepActions = [];

  Object.keys(CFG).forEach((id) => {
    const scene = document.getElementById(id);
    if (!scene) return;
    const viz = scene.querySelector(".viz-card");
    const prompt = scene.querySelector(".prompt");
    if (!viz) return;

    const graphic = document.createElement("div");
    graphic.className = "graphic";
    graphic.appendChild(viz); // move the rendered chart (SVG + handlers preserved)

    const col = document.createElement("div");
    col.className = "steps";
    CFG[id].forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "step";
      // Step 0 keeps the scene's original prompt. Move the live child nodes
      // (not an innerHTML copy) so listeners on the redraft button + weight
      // sliders survive the scene.innerHTML reset below.
      if (i === 0 && prompt) {
        while (prompt.firstChild) d.appendChild(prompt.firstChild);
      }
      if (s.html) d.insertAdjacentHTML("beforeend", s.html);
      col.appendChild(d);
      stepActions.push({ el: d, fire: s.fire });
    });

    scene.innerHTML = "";
    scene.classList.add("scrolly");
    scene.appendChild(col);
    scene.appendChild(graphic);
  });

  // activate steps on scroll → fire the matching control
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const a = stepActions.find((x) => x.el === e.target);
        if (!a) return;
        stepActions.forEach((x) =>
          x.el.classList.toggle("active", x.el === e.target)
        );
        if (a.fire) a.fire();
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  stepActions.forEach((a) => obs.observe(a.el));

  // hide the scroll hint after first scroll
  const hint = document.getElementById("scroll-hint");
  addEventListener(
    "scroll",
    () => {
      if (window.scrollY > 200 && hint) hint.style.opacity = "0";
    },
    { passive: true }
  );
})();
