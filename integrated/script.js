const { POINTS, PAY } = window.INDEX_SCROLL_THREAT_DATA || {};
const { GAP, CATCH, SHORT } = window.INDEX_SCROLL_PAY_DATA || {};
const { ATRO, PREM, TASKS } = window.INDEX_SCROLL_VERIFY_DATA || {};
const { languageSkills, redraftWeights } = window.INDEX_SCROLL_REDRAFT_DATA || {};
// Source script block 1.
// Act 1 — "Y-axis morph": the SAME developer dots first sit on an AI-use
// cadence axis (threatened devs skew higher), then slide to a salary axis where
// the three group medians fall level. Driven by scroll via window.__threatSetMode.
(function(){
  const tip = d3.select("#tooltip");
  const showTip = (e,h)=>tip.html(h).style("left",e.clientX+"px").style("top",e.clientY+"px").classed("visible",true);
  const hideTip = ()=>tip.classed("visible",false);

  const fmtK = d => "$" + d3.format(".0f")(d/1000) + "K";
  const fmt$ = d => "$" + d3.format(",")(Math.round(d));

  const W=980, H=440, m={t:40,r:60,b:54,l:64};
  const svg = d3.select("#gi-svg");
  const groups = ["Feel threatened","Not threatened","Unsure"];   // x categories
  const threatByGroup = {}; PAY.forEach(p=>threatByGroup[p.threat]=p);

  // modeled AI-use intensity per group (see threat_salary_data.js → AI_USE)
  const AI = (window.INDEX_SCROLL_THREAT_DATA && window.INDEX_SCROLL_THREAT_DATA.AI_USE) || {
    levels:["Won't","Plan to","Monthly","Weekly","Daily"],
    meanByGroup:{"Feel threatened":3.05,"Not threatened":2.05,"Unsure":2.55},
    spread:0.95, threatRateLow:10, threatRateHigh:21
  };

  const x   = d3.scalePoint().domain(groups).range([m.l+90, W-m.r-90]).padding(0.5);
  const ySal= d3.scaleLinear().domain([0,300000]).range([H-m.b, m.t]);   // salary
  const yAI = d3.scaleLinear().domain([-0.4,4.4]).range([H-m.b, m.t]);   // AI cadence 0..4

  // tiny seeded PRNG so the modeled AI values are stable across reloads
  function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

  // build one node per developer: real salary + modeled AI cadence
  const nodes=[];
  groups.forEach((grp,gi)=>{
    const vals=POINTS[grp]||[], mu=AI.meanByGroup[grp], sp=AI.spread, rand=rng(1000*(gi+1)+7);
    vals.forEach(v=>{
      let a=mu+(rand()+rand()+rand()-1.5)*sp*1.3;   // ~bell-shaped around the group mean
      a=Math.max(-0.35,Math.min(4.35,a));
      nodes.push({grp,gi,v,ai:a});
    });
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
                       : grp==="Not threatened" ? "#0f766e"
                       : "#94a3b8";

  // left axes (salary + AI), cross-faded by mode
  const axS = svg.append("g").attr("class","axis").attr("transform","translate("+m.l+",0)")
    .call(d3.axisLeft(ySal).ticks(6).tickFormat(fmtK));
  const axA = svg.append("g").attr("class","axis").attr("transform","translate("+m.l+",0)")
    .style("opacity",0).call(d3.axisLeft(yAI).tickValues([0,1,2,3,4]).tickFormat(i=>AI.levels[i]));
  const axTitle = svg.append("text").attr("transform","rotate(-90)")
    .attr("x",-H/2).attr("y",16).attr("text-anchor","middle")
    .attr("fill","#667085").attr("font-size",12).text("AI use cadence");

  // developer dots (start in AI-cadence positions)
  const dots = svg.append("g").selectAll("circle").data(nodes).join("circle")
    .attr("r",R).attr("fill",d=>colorOf(d.grp)).attr("fill-opacity",0.5)
    .attr("stroke","#fff").attr("stroke-width",0.4).style("cursor","pointer")
    .attr("cx",d=>d.cx+d.aiOX).attr("cy",d=>d.aiY)
    .on("mousemove",(e,d)=>showTip(e,"<b>"+d.grp+"</b><br>salary "+fmt$(d.v)+"<br>AI use ≈ "+AI.levels[Math.round(Math.max(0,Math.min(4,d.ai)))]))
    .on("mouseleave",hideTip);

  // per-group median bar + label (moves between modes); static group labels
  const medG=svg.append("g"); const med={};
  groups.forEach(grp=>{
    const cx=x(grp);
    med[grp]={
      bar: medG.append("line").attr("x1",cx-46).attr("x2",cx+46).attr("stroke","#1f2c44").attr("stroke-width",2.5),
      lab: medG.append("text").attr("x",cx).attr("text-anchor","middle").attr("fill","#1f2c44").attr("font-size",12).attr("font-weight",700)
    };
    svg.append("text").attr("x",cx).attr("y",H-m.b+18).attr("text-anchor","middle").attr("fill","#667085").attr("font-size",12).text(grp);
    svg.append("text").attr("x",cx).attr("y",H-m.b+34).attr("text-anchor","middle").attr("fill","var(--red)").attr("font-size",11).text(threatByGroup[grp].n.toLocaleString()+" devs");
  });

  // dashed connector across the three salary medians (-> visibly flat in salary mode)
  const connector = svg.append("path").datum(PAY).attr("fill","none")
    .attr("stroke","#1f2c44").attr("stroke-width",1.5).attr("stroke-dasharray","5 4").attr("opacity",0)
    .attr("d", d3.line().x(d=>x(d.threat)).y(d=>ySal(d.median_comp)));
  const flatNote = svg.append("text").attr("x",W-m.r-80).attr("y",ySal(150000)-14)
    .attr("fill","#1f2c44").attr("font-size",11).attr("font-style","italic").attr("opacity",0).text("medians ≈ flat");

  // dynamic caption at top of plot
  const modeNote = svg.append("text").attr("x",m.l+90).attr("y",m.t-16)
    .attr("fill","#667085").attr("font-size",12).attr("font-weight",600);

  function setMode(mode, animate){
    const sal = mode==="salary";
    const dur = animate ? 950 : 0;
    const t = svg.transition().duration(dur).ease(d3.easeCubicInOut);
    dots.transition(t).attr("cx",d=>d.cx+(sal?d.salOX:d.aiOX)).attr("cy",d=>sal?d.salY:d.aiY);
    axS.transition(t).style("opacity",sal?1:0);
    axA.transition(t).style("opacity",sal?0:1);
    axTitle.text(sal?"Annual salary (USA, USD)":"AI use cadence");
    groups.forEach(grp=>{
      const yPos = sal ? ySal(threatByGroup[grp].median_comp) : yAI(AI.meanByGroup[grp]);
      med[grp].bar.transition(t).attr("y1",yPos).attr("y2",yPos);
      med[grp].lab.transition(t).attr("y",yPos-8).text(sal?fmt$(threatByGroup[grp].median_comp):AI.levels[Math.round(AI.meanByGroup[grp])]);
    });
    connector.transition(t).attr("opacity",sal?0.6:0);
    flatNote.transition(t).attr("opacity",sal?0.85:0);
    modeNote.text(sal
      ? "Same pay, whatever the fear — the three medians sit level."
      : "Threatened developers skew toward heavier AI use ("+AI.threatRateLow+"% → "+AI.threatRateHigh+"% feel threatened, non-users → daily users).");
  }
  window.__threatSetMode = setMode;

  d3.select("#gi-legend").html(
    '<span class="legend-item"><span class="swatch" style="background:var(--red)"></span>Feel threatened</span>' +
    '<span class="legend-item"><span class="swatch" style="background:#0f766e"></span>Not threatened</span>' +
    '<span class="legend-item"><span class="swatch" style="background:#94a3b8"></span>Unsure</span>' +
    '<span class="legend-item" style="opacity:.8">Scroll: the Y axis morphs from AI-use cadence &rarr; salary.</span>'
  );

  setMode("ai", false);   // initial view = AI-use cadence
})();

// Source script block 2.
(function(){
  "use strict";
  // ---- inlined data: Q2_geo_gap_years (gap / pay / n per year) ----
  // ---- inlined data: q2_country (2025 median pay vs AI-daily adoption) ----
  const HIGH = "#0e7490", LOW = "#c2570c", YEARS = ["2023","2024","2025"];
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

  const gx = d3.scaleLog().domain([5000,160000]).range([0,iw]).clamp(true);
  const gy = d3.scaleLinear().domain([-45,60]).range([ih,0]);
  const gr = d3.scaleSqrt().domain([0,d3.max(allN)]).range([3,30]);

  // big faint year watermark (behind everything in this layer)
  const wm = gapLayer.append("text")
    .attr("x", iw - 6).attr("y", ih - 6)
    .attr("text-anchor","end")
    .attr("font-size", 130).attr("font-weight", 800)
    .attr("fill", "#eef1f6")
    .text(YEARS[0]);

  // x gridlines at tick values
  const gxTicks = [5000,10000,30000,80000,160000];
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
    .text("← lower-paying countries     Country's typical pay (log)     higher-paying →");
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
    .attr("stroke","#9aa6bb").attr("stroke-width",1.5).attr("stroke-dasharray","6 4");
  gapLayer.append("text")
    .attr("x",4).attr("y",gy(0)-7)
    .attr("fill","#8b97ac").attr("font-size",11.5).attr("font-weight",600)
    .text("parity — AI users earn the same");

  // bubbles (start at 2023)
  const bub = gapLayer.append("g").selectAll("circle.pay-bub")
    .data(GAP, d=>d.country).join("circle")
    .attr("class","pay-bub")
    .attr("fill", d=>d.tier==="high"?HIGH:LOW)
    .attr("fill-opacity",0.62)
    .attr("stroke","#fff").attr("stroke-width",1)
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
    .attr("paint-order","stroke").attr("stroke","#fff").attr("stroke-width",2.6)
    .style("pointer-events","none")
    .text(d=>shortName(d.country));

  // annotation block under the gap chart (in-SVG, multi-line)
  const annoG = gapLayer.append("text")
    .attr("x", 0).attr("y", ih + 58)
    .attr("font-size",12).attr("fill","var(--ink)");
  annoG.append("tspan").attr("x",0).attr("dy",0).attr("font-weight",700)
    .text("Most countries sit ABOVE the line — AI users earn more — and 2023→2025 the gap grew in most");
  annoG.append("tspan").attr("x",0).attr("dy",15).attr("font-weight",700)
    .text("(USA +0→+14%, India −28→+54%). A few fell below (Ukraine). ")
    .append("tspan").attr("font-weight",400).attr("fill","var(--muted)")
    .text("Caveat: AI-daily users also tend");
  annoG.append("tspan").attr("x",0).attr("dy",15).attr("font-weight",400).attr("fill","var(--muted)")
    .text("to be more experienced — a pattern, not proof of cause.");

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
    d3.selectAll("#pay-years .pay-yr").classed("active", d=>d===Y);
  }

  // ======================================================================
  // VIEW B — Catch-up (static scatter, 2025) — hidden by default
  // ======================================================================
  const catchLayer = root.append("g").attr("class","pay-layer").style("display","none");

  const cx = d3.scaleLog().domain([15000,160000]).range([0,iw]).clamp(true);
  const cy = d3.scaleLinear().domain([30,65]).range([ih,0]);
  const cr = d3.scaleSqrt().domain([0,d3.max(CATCH,d=>d.n)]).range([4,28]);

  // y gridlines
  catchLayer.append("g").attr("class","grid")
    .selectAll("line").data(cy.ticks(6)).join("line")
    .attr("x1",0).attr("x2",iw).attr("y1",d=>cy(d)).attr("y2",d=>cy(d));

  const cxTicks=[15000,30000,60000,120000,160000];
  catchLayer.append("g").attr("class","axis")
    .attr("transform","translate(0,"+ih+")")
    .call(d3.axisBottom(cx).tickValues(cxTicks).tickFormat(fmtK))
    .call(g=>g.select(".domain").remove());
  catchLayer.append("g").attr("class","axis")
    .call(d3.axisLeft(cy).ticks(6).tickFormat(d=>d+"%"))
    .call(g=>g.select(".domain").remove());

  catchLayer.append("text")
    .attr("x", iw/2).attr("y", ih + 42)
    .attr("text-anchor","middle").attr("fill","var(--muted)")
    .attr("font-size",12.5).attr("font-weight",600)
    .text("National median developer pay (log)");
  catchLayer.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -ih/2).attr("y", -46)
    .attr("text-anchor","middle").attr("fill","var(--muted)")
    .attr("font-size",12.5).attr("font-weight",600)
    .text("AI-daily adoption (%)");

  // least-squares trend line on (median_comp, ai_daily_pct) — drawn across the x-range
  (function(){
    const n=CATCH.length;
    const sx=d3.sum(CATCH,d=>d.median_comp), sy=d3.sum(CATCH,d=>d.ai_daily_pct);
    const sxy=d3.sum(CATCH,d=>d.median_comp*d.ai_daily_pct), sxx=d3.sum(CATCH,d=>d.median_comp*d.median_comp);
    const slope=(n*sxy-sx*sy)/(n*sxx-sx*sx), intc=(sy-slope*sx)/n;
    const x0=15000, x1=160000;
    catchLayer.append("line").attr("class","boundary-line")
      .attr("x1",cx(x0)).attr("y1",cy(intc+slope*x0))
      .attr("x2",cx(x1)).attr("y2",cy(intc+slope*x1))
      .attr("stroke","#9aa6bb").attr("stroke-width",2).attr("stroke-dasharray","6 4").attr("opacity",0.85);
    catchLayer.append("text")
      .attr("x", cx(120000)).attr("y", cy(intc+slope*120000)-8)
      .attr("text-anchor","end").attr("fill","#8b97ac")
      .attr("font-size",11).attr("font-style","italic")
      .text("more pay → less daily AI");
  })();

  // bubbles (single emphasis colour)
  catchLayer.append("g").selectAll("circle.pay-cbub")
    .data(CATCH).join("circle")
    .attr("class","pay-cbub")
    .attr("cx", d=>cx(d.median_comp))
    .attr("cy", d=>cy(d.ai_daily_pct))
    .attr("r",  d=>cr(d.n))
    .attr("fill","var(--night)").attr("fill-opacity",0.55)
    .attr("stroke","#fff").attr("stroke-width",1)
    .style("cursor","pointer")
    .on("mousemove",(e,d)=>showTip(e,"<b>"+shortName(d.country)+"</b><br>Pay "+fmtK(d.median_comp)+" · AI-daily "+d.ai_daily_pct+"% · N="+d.n.toLocaleString()))
    .on("mouseleave", hideTip);

  // labels for selected catch-up countries
  const cLabelSet = new Set(["United States of America","India","Ukraine","Switzerland","Spain"]);
  catchLayer.append("g").selectAll("text.pay-clab2")
    .data(CATCH.filter(d=>cLabelSet.has(d.country))).join("text")
    .attr("class","pay-clab2 label")
    .attr("x", d=>cx(d.median_comp))
    .attr("y", d=>cy(d.ai_daily_pct)-cr(d.n)-5)
    .attr("text-anchor","middle")
    .attr("font-size",11).attr("font-weight",600)
    .attr("fill","var(--ink)")
    .attr("paint-order","stroke").attr("stroke","#fff").attr("stroke-width",2.6)
    .style("pointer-events","none")
    .text(d=>shortName(d.country));

  // catch-up annotation (under chart)
  const cAnno = catchLayer.append("text")
    .attr("x",0).attr("y", ih + 58)
    .attr("font-size",12).attr("fill","var(--ink)");
  cAnno.append("tspan").attr("x",0).attr("dy",0).attr("font-weight",700)
    .text("The poorer the market, the harder developers adopt AI (India $17k→60%, USA $150k→40%).");
  cAnno.append("tspan").attr("x",0).attr("dy",15).attr("font-weight",700)
    .text("Pool everyone together and the low-pay, high-adoption countries drag the average down —");
  cAnno.append("tspan").attr("x",0).attr("dy",15).attr("font-weight",700)
    .text("that's the ")
    .append("tspan").attr("fill","var(--red)").text("−62% mirage.");

  // ======================================================================
  // Controls: year chips (injected into #pay-controls), play, view pills
  // ======================================================================
  // build year chips into the controls bar, between play and the view pills
  const yrWrap = d3.select("#pay-controls").insert("span",'[data-view="gap"]')
    .attr("id","pay-years").attr("class","legend").style("gap","6px");
  yrWrap.selectAll("button").data(YEARS).join("button")
    .attr("class","pill pay-yr")
    .classed("active", d=>d===YEARS[0])
    .text(d=>d)
    .on("click",(e,d)=>{ stop(); renderGap(YEARS.indexOf(d), true); });

  let playing=false, timer=null;
  function stop(){ playing=false; if(timer) clearTimeout(timer); timer=null; d3.select("#pay-play").text("▶ Play"); }
  function play(){
    if(gapIdx>=YEARS.length-1) renderGap(0,false);
    playing=true; d3.select("#pay-play").text("❚❚ Pause");
    const step=()=>{ if(!playing) return; if(gapIdx<YEARS.length-1){ renderGap(gapIdx+1,true); timer=setTimeout(step,1700);} else stop(); };
    timer=setTimeout(step,1200);
  }
  d3.select("#pay-play").on("click",()=>playing?stop():play());

  // legend content (depends on active view)
  const legend = d3.select("#pay-legend");
  function setLegend(view){
    if(view==="gap"){
      legend.html(
        '<span class="legend-item"><span class="swatch" style="background:'+HIGH+'"></span>Higher-income country</span>'+
        '<span class="legend-item"><span class="swatch" style="background:'+LOW+'"></span>Lower-income country</span>'+
        '<span class="legend-item" style="color:var(--muted)">above the line = AI users earn more · size = #devs</span>'+
        '<span class="legend-item" style="color:var(--muted)">"AI user" = uses AI tools (any frequency)</span>'
      );
    } else {
      legend.html(
        '<span class="legend-item"><span class="swatch" style="background:var(--night)"></span>Country (2025)</span>'+
        '<span class="legend-item" style="color:var(--muted)">size = #devs · dashed line = inverse trend</span>'+
        '<span class="legend-item" style="color:var(--muted)">"AI-daily" = uses AI daily (a different SO question)</span>'
      );
    }
  }

  // view switching via the two data-view pills
  function setView(view){
    const isGap = view==="gap";
    d3.selectAll('#pay-controls .pill[data-view]').classed("active", function(){
      return this.getAttribute("data-view")===view;
    });
    // play + year chips only make sense for the animated gap view
    d3.select("#pay-play").style("display", isGap?null:"none");
    yrWrap.style("display", isGap?null:"none");
    if(!isGap) stop();
    d3.select("#pay-title").text(isGap
      ? "AI pay gap by country · 2023 → 2025"
      : "Adoption vs. pay · why the average lies · 2025");
    gapLayer.style("display", isGap?null:"none");
    catchLayer.style("display", isGap?"none":null);
    if(isGap){ renderGap(gapIdx, false); }
    setLegend(view);
  }
  d3.selectAll('#pay-controls .pill[data-view]').on("click", function(){
    setView(this.getAttribute("data-view"));
  });

  // initial render: gap view, year 2023, no animation
  renderGap(0, false);
  setLegend("gap");
})();

// Source script block 3.
(function(){
  /* ---------- inlined data ---------- */
  /* re-theme: dark -> light */
  const RED = "#c24136";    // atrophy (was #f87171)
  const GREEN = "#0f766e";  // premium / delegated (was #4ade80)
  const INK = "#1f2c44";    // primary text + dot markers (was #fff/#e0e0e0)
  const SUB = "#667085";    // secondary text (was #888/#666/#ccc)
  const CENTER = "#cad2df"; // center axis (was #555)
  const CONN = "#cad2df";   // connector lines (was #333)
  const DOTSTROKE = "#ffffff"; // dot stroke (was #0a0a0f)

  const tip = d3.select("#tooltip");
  const showTip = (e,h)=>tip.html(h).style("left",e.clientX+"px").style("top",e.clientY+"px").classed("visible",true);
  const hideTip = ()=>tip.classed("visible",false);

  const W = 980, H = 480;
  const svg = d3.select("#vf-svg");

  /* ============ VIEW A — Skill atrophy = SCENE 6 mirror / diverging area ============ */
  const gA = svg.append("g").attr("id","vf-atrophy");
  (function(){
    const m = {t:30, r:120, b:30, l:60};
    const buckets = ATRO.map(d=>d.bucket);
    const premByBucket = {}; PREM.forEach(d=>premByBucket[d.bucket]=d.premium);
    const data = ATRO.map(d=>({bucket:d.bucket, atrophy:d.atrophy, prem:premByBucket[d.bucket]??null}));
    const x = d3.scalePoint().domain(buckets).range([m.l, W-m.r]).padding(0.4);
    const mid = (m.t + (H-m.b)) / 2;
    const yUp = d3.scaleLinear().domain([0,40]).range([mid-8, m.t]);     // atrophy upward
    const yDn = d3.scaleLinear().domain([0,30]).range([mid+8, H-m.b]);   // premium downward

    // center axis
    gA.append("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",mid).attr("y2",mid).attr("stroke",CENTER);
    gA.selectAll(".vf-xt").data(buckets).join("text").attr("class","vf-xt")
      .attr("x",d=>x(d)).attr("y",mid+4).attr("dy","0.7em")
      .attr("text-anchor","middle").attr("fill",SUB).attr("font-size",11).text(d=>d);
    gA.append("text").attr("x",W/2).attr("y",mid-2).attr("text-anchor","middle")
      .attr("fill",SUB).attr("font-size",10).text("← junior      experience      senior →");

    const areaUp = d3.area().x(d=>x(d.bucket)).y0(mid).y1(d=>yUp(d.atrophy)).curve(d3.curveMonotoneX);
    const areaDn = d3.area().defined(d=>d.prem!=null).x(d=>x(d.bucket)).y0(mid).y1(d=>yDn(d.prem)).curve(d3.curveMonotoneX);

    // top: skill-atrophy fear (shrinks with experience) — red area, growing UPWARD
    const up = gA.append("path").datum(data).attr("fill",RED).attr("opacity",0).attr("d",areaUp);
    up.transition().duration(800).attr("opacity",0.32);
    // bottom: AI salary premium (positive at every level) — green area, growing DOWNWARD
    const dn = gA.append("path").datum(data).attr("fill",GREEN).attr("opacity",0).attr("d",areaDn);
    dn.transition().duration(800).delay(300).attr("opacity",0.30);

    data.forEach((d,i)=>{
      gA.append("circle").attr("cx",x(d.bucket)).attr("cy",yUp(d.atrophy)).attr("r",0)
        .attr("fill",INK).attr("stroke",DOTSTROKE).attr("stroke-width",1).style("cursor","pointer")
        .on("mousemove",(e)=>showTip(e,"<b>"+d.bucket+" yr</b><br>feel skills eroding: "+d.atrophy+"%")).on("mouseleave",hideTip)
        .transition().delay(i*70).attr("r",3.5);
      if(d.prem!=null) gA.append("circle").attr("cx",x(d.bucket)).attr("cy",yDn(d.prem)).attr("r",0)
        .attr("fill",INK).attr("stroke",DOTSTROKE).attr("stroke-width",1).style("cursor","pointer")
        .on("mousemove",(e)=>showTip(e,"<b>"+d.bucket+" yr (USA)</b><br>AI salary premium: +"+d.prem+"%")).on("mouseleave",hideTip)
        .transition().delay(300+i*70).attr("r",3.5);
    });

    // end value labels (atrophy, first & last bucket)
    const a0 = data[0], aN = data[data.length-1];
    gA.append("text").attr("x",x(a0.bucket)).attr("y",yUp(a0.atrophy)-8).attr("text-anchor","middle")
      .attr("fill",RED).attr("font-size",12).attr("font-weight",700).attr("opacity",0).text(a0.atrophy+"%")
      .transition().delay(700).attr("opacity",1);
    gA.append("text").attr("x",x(aN.bucket)).attr("y",yUp(aN.atrophy)-8).attr("text-anchor","middle")
      .attr("fill",RED).attr("font-size",12).attr("font-weight",700).attr("opacity",0).text(aN.atrophy+"%")
      .transition().delay(700).attr("opacity",1);

    // right-side labels
    gA.append("text").attr("x",W-m.r+8).attr("y",yUp(15)).attr("fill",RED).attr("font-size",11.5)
      .attr("font-weight",600).attr("opacity",0).text("fear: skills").transition().delay(800).attr("opacity",1);
    gA.append("text").attr("x",W-m.r+8).attr("y",yUp(15)+15).attr("fill",RED).attr("font-size",11.5)
      .attr("opacity",0).text("eroding").transition().delay(800).attr("opacity",0.9);
    gA.append("text").attr("x",W-m.r+8).attr("y",yDn(15)).attr("fill",GREEN).attr("font-size",11.5)
      .attr("font-weight",600).attr("opacity",0).text("AI salary").transition().delay(1000).attr("opacity",1);
    gA.append("text").attr("x",W-m.r+8).attr("y",yDn(15)+15).attr("fill",GREEN).attr("font-size",11.5)
      .attr("opacity",0).text("premium (USA)").transition().delay(1000).attr("opacity",0.9);
  })();

  /* ============ VIEW B — Trust boundary = SCENE 5 1-D delegation spectrum ============ */
  const gB = svg.append("g").attr("id","vf-trust").style("display","none");
  (function(){
    const m = {t:50, r:40, b:70, l:40};
    const x = d3.scaleLinear().domain([0,62]).range([m.l+40, W-m.r-40]);   // "% doing this with AI now"
    const axisY = H - m.b;

    // gradient strip background: left = human-only, right = AI-heavy
    const defs = gB.append("defs");
    const grad = defs.append("linearGradient").attr("id","vf-delg").attr("x1","0").attr("x2","1");
    grad.append("stop").attr("offset","0").attr("stop-color",RED).attr("stop-opacity",.16);
    grad.append("stop").attr("offset","1").attr("stop-color",GREEN).attr("stop-opacity",.16);
    gB.append("rect").attr("x",x(0)).attr("y",axisY-12).attr("width",x(62)-x(0)).attr("height",24).attr("rx",12).attr("fill","url(#vf-delg)");

    // bottom axis (use host .axis class for light theme)
    gB.append("g").attr("class","axis").attr("transform","translate(0,"+(axisY+22)+")")
      .call(d3.axisBottom(x).ticks(6).tickFormat(d=>d+"%"));

    gB.append("text").attr("x",x(0)).attr("y",axisY+58).attr("fill",RED).attr("font-size",12).text("◀ kept human");
    gB.append("text").attr("x",x(62)).attr("y",axisY+58).attr("text-anchor","end").attr("fill",GREEN).attr("font-size",12).text("delegated to AI ▶");
    gB.append("text").attr("x",W/2).attr("y",20).attr("text-anchor","middle").attr("fill",INK).attr("font-size",13).attr("font-weight",600).text("Share of developers already doing each task with AI");

    // semantic cliff: exploration tasks (>=30% now) vs production/judgment tasks (<30%)
    const sorted = TASKS.slice().sort((a,b)=>b.now-a.now);
    const THR = 30;
    const cliffX = x(THR);

    // cliff divider
    gB.append("line").attr("x1",cliffX).attr("x2",cliffX).attr("y1",m.t+6).attr("y2",axisY+10)
      .attr("stroke",SUB).attr("stroke-dasharray","4 4").attr("opacity",0).transition().delay(700).attr("opacity",0.55);
    gB.append("text").attr("x",cliffX).attr("y",m.t-4).attr("text-anchor","middle").attr("fill",SUB).attr("font-size",11).attr("font-style","italic")
      .attr("opacity",0).text("the trust cliff").transition().delay(800).attr("opacity",0.9);

    sorted.forEach((d,i)=>{
      const cx = x(d.now), cy = axisY, lift = (i%2?-1:1)*(28+((i*23)%70));
      const expl = d.now >= THR;
      const col = expl ? GREEN : RED;
      const g = gB.append("g").attr("opacity",0);
      // connector from dot to label
      g.append("line").attr("x1",cx).attr("x2",cx).attr("y1",cy).attr("y2",cy+lift).attr("stroke",CONN);
      g.append("circle").attr("cx",cx).attr("cy",cy).attr("r",0).attr("fill",col).attr("stroke",DOTSTROKE).attr("stroke-width",1).style("cursor","pointer")
        .on("mousemove",(e)=>showTip(e,"<b>"+d.task+"</b><br>AI now "+d.now+"% · \"mostly AI\" "+d.mostly+"% · won't use "+d.refused+"%")).on("mouseleave",hideTip)
        .transition().duration(500).delay(i*55).attr("r",Math.max(5,Math.sqrt(d.n)/22));
      g.append("text").attr("x",cx).attr("y",cy+lift+(lift<0?-2:11)).attr("text-anchor","middle").attr("fill",INK).attr("font-size",10.5)
        .text(d.task.length>22?d.task.slice(0,21)+"…":d.task);
      g.append("text").attr("x",cx).attr("y",cy+lift+(lift<0?-15:24)).attr("text-anchor","middle").attr("fill",col).attr("font-size",10).attr("font-weight",600)
        .text(d.now+"%");
      g.transition().duration(400).delay(i*55).attr("opacity",1);
    });
  })();

  /* ============ Legends ============ */
  const legendAtro =
    '<span class="legend-item"><span class="swatch" style="background:'+RED+'"></span>▲ % who feel AI is eroding their own skills</span>' +
    '<span class="legend-item"><span class="swatch" style="background:'+GREEN+'"></span>▼ AI-daily salary premium (USA)</span>';
  const legendTrust =
    '<span class="legend-item"><span class="swatch" style="background:'+GREEN+'"></span>exploration (search, write, learn, debug)</span>' +
    '<span class="legend-item"><span class="swatch" style="background:'+RED+'"></span>production / judgment (commit, plan, deploy)</span>' +
    '<span class="legend-item" style="color:'+SUB+'">dot size = sample</span>';

  function setView(view){
    const isAtro = view === "atrophy";
    gA.style("display", isAtro ? null : "none");
    gB.style("display", isAtro ? "none" : null);
    d3.select("#vf-title").text(isAtro ? "Skill atrophy vs AI pay premium · by experience" : "The trust boundary · delegation spectrum by task");
    d3.select("#vf-legend").html(isAtro ? legendAtro : legendTrust);
    d3.selectAll("#vf-controls .pill").classed("active", function(){
      return this.getAttribute("data-view") === view;
    });
    hideTip();
  }

  d3.selectAll("#vf-controls .pill").on("click", function(){
    setView(this.getAttribute("data-view"));
  });

  // default = atrophy
  setView("atrophy");
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
const personaText = {
  seeker: {
    dev: "Find a large market, then prove you can use AI without hiding your judgment.",
    task: "For job seekers, portfolio work should show both AI-assisted speed and human verification.",
    skill: "The strongest portfolio signals are problem framing, verification, and product context.",
    redraft: "A job seeker should balance current demand with fast-growing AI-era stacks."
  },
  junior: {
    dev: "The junior map is about learning depth: do not let shortcuts replace debugging practice.",
    task: "Junior risk appears where AI is easy to use but hard to trust.",
    skill: "Verification and debugging are the muscles to protect.",
    redraft: "A junior should choose skills that create practice, not only output."
  },
  senior: {
    dev: "The senior map is about leverage: accountability grows as generation gets cheaper.",
    task: "Senior value concentrates around planning, architecture, review, and deployment boundaries.",
    skill: "Architecture, tradeoff judgment, mentoring, and domain knowledge become premium skills.",
    redraft: "A senior should favor stacks that connect AI to systems, risk, and architecture."
  }
};

document.querySelectorAll(".persona").forEach(button => {
  button.addEventListener("click", () => {
    state.persona = button.dataset.persona;
    document.querySelectorAll(".persona").forEach(b => b.classList.toggle("active", b === button));
    document.getElementById("redraft-insight").textContent = personaText[state.persona].redraft;
    state.weights = { ...redraftWeights[state.persona] };
    syncWeightControls();
    renderClusters();
    renderRedraft();
  });
});

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
const clusterCats = clusterData?.cats || [
  { id: "problem", name: "Problem Solving", color: "#f97316" },
  { id: "design", name: "System Design", color: "#4e9af1" },
  { id: "comm", name: "Communication", color: "#a78bfa" },
  { id: "domain", name: "Domain Sense", color: "#34d399" },
  { id: "fund", name: "CS Fundamentals", color: "#facc15" },
  { id: "ai", name: "AI Fluency", color: "#ec4899" },
  { id: "adapt", name: "Adaptability", color: "#22d3ee" }
];
const clusterCatById = Object.fromEntries(clusterCats.map(d => [d.id, d]));
const clusterSubs = (clusterData?.subs || []).slice()
  .sort((a, b) => b.count - a.count)
  .slice(0, 30)
  .map(d => ({
    ...d,
    color: clusterCatById[d.cat]?.color || "#64748b",
    catName: clusterCatById[d.cat]?.name || "Cluster",
    seniorShare: d.expW ? (d.expW[3] || 0) + (d.expW[4] || 0) : .45,
    juniorShare: d.expW ? (d.expW[0] || 0) + (d.expW[1] || 0) : .2
  }));
const clusterSvg = d3.select("#cluster-bubbles");
const clusterW = 860, clusterH = 620;
const clusterRadius = d3.scaleSqrt()
  .domain(d3.extent(clusterSubs, d => d.count))
  .range([16, 62]);
const clusterGroup = clusterSvg.append("g");
const clusterNodes = clusterSubs.map((d, i) => ({
  ...d,
  x: clusterW / 2 + Math.cos(i) * 80,
  y: clusterH / 2 + Math.sin(i) * 80,
  r: clusterRadius(d.count)
}));
clusterCats.forEach((cat, i) => {
  const angle = i / clusterCats.length * Math.PI * 2 - Math.PI / 2;
  cat.anchorX = clusterW / 2 + Math.cos(angle) * 260;
  cat.anchorY = clusterH / 2 + Math.sin(angle) * 210;
  const labelOffsets = {
    problem: { x: -118, y: -70 },
    design: { x: 92, y: -48 },
    comm: { x: 92, y: 38 },
    domain: { x: 70, y: 82 },
    fund: { x: -72, y: 82 },
    ai: { x: -92, y: 38 },
    adapt: { x: -92, y: -48 }
  };
  const offset = labelOffsets[cat.id] || { x: Math.cos(angle) * 72, y: Math.sin(angle) * 72 };
  cat.labelX = cat.anchorX + offset.x;
  cat.labelY = cat.anchorY + offset.y;
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
  .force("charge", d3.forceManyBody().strength(8))
  .force("collide", d3.forceCollide(d => d.r + 4))
  .force("x", d3.forceX(d => clusterCatById[d.cat]?.anchorX || clusterW / 2).strength(.12))
  .force("y", d3.forceY(d => clusterCatById[d.cat]?.anchorY || clusterH / 2).strength(.12))
  .on("tick", () => {
    clusterCircles.attr("cx", d => d.x).attr("cy", d => d.y);
    clusterLabels.attr("x", d => d.x).attr("y", d => d.y + 4);
  });
const clusterCircles = clusterGroup.selectAll("circle").data(clusterNodes, d => d.id).join("circle")
  .attr("r", d => d.r)
  .attr("fill", d => d.color)
  .attr("fill-opacity", .72)
  .attr("stroke", "#111827")
  .attr("stroke-width", 1.4)
  .on("mousemove", (event, d) => {
    const terms = (d.terms || []).slice(0, 5).join(", ");
    const quote = d.quotes?.[0]?.t ? d.quotes[0].t.slice(0, 180) + (d.quotes[0].t.length > 180 ? "..." : "") : "";
    showTip(event, `<b>${d.name}</b><br>${d.catName} · ${d3.format(",")(d.count)} mentions<br>${terms}<br><br>${quote}`);
  })
  .on("mouseleave", hideTip);
const clusterLabels = clusterGroup.selectAll(".cluster-label").data(clusterNodes, d => d.id).join("text")
  .attr("class", "cluster-label")
  .text(d => d3.format(",")(d.count));
function renderClusters() {
  const filter = state.clusterFilter === "all"
    ? (state.persona === "senior" ? "senior" : state.persona === "junior" ? "junior" : "all")
    : state.clusterFilter;
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
document.getElementById("cluster-legend").innerHTML = clusterCats.map(cat => `<span class="legend-item"><i class="swatch" style="background:${cat.color}"></i>${cat.name}</span>`).join("");

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
    node.classList.toggle("changed", d.move !== 0);
    node.querySelector(".rank").textContent = d.rank;
    node.querySelector(".skill-meta").textContent = d.meta;
    node.querySelector(".score-fill").style.width = `${d.score}%`;
    const badge = node.querySelector(".move-badge");
    badge.textContent = d.move > 0 ? `+${d.move}` : d.move < 0 ? `${d.move}` : "0";
    badge.classList.toggle("up", d.move > 0);
    badge.classList.toggle("down", d.move < 0);
  });
  items.forEach(d => {
    const node = existing.get(d.name) || el.querySelector(`.skill-card[data-skill="${CSS.escape(d.name)}"]`);
    if (node) el.appendChild(node);
  });
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
    state.weights[key] = Number(input.value);
    document.getElementById(`weight-${key}-value`).value = state.weights[key];
    state.redrafted = true;
    document.getElementById("weight-note").textContent = `Custom ${personaName()} weights: popularity ${state.weights.pop}, momentum ${state.weights.growth}, AI fit ${state.weights.ai}.`;
    document.getElementById("redraft-button").textContent = "Redraft Again";
    renderRedraft();
  });
});
document.getElementById("redraft-button").addEventListener("click", () => {
  if (state.redrafted) {
    state.redrafted = false;
    renderRedraft();
    window.setTimeout(() => {
      state.redrafted = true;
      renderRedraft();
    }, 140);
  } else {
    state.redrafted = true;
  }
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
  function setRedraft(want) {
    const t = document.getElementById("redraft-title");
    const btn = document.getElementById("redraft-button");
    if (!t || !btn) return;
    const isRedrafted = /AI-era/i.test(t.textContent);
    if (want && !isRedrafted) btn.click();
    if (!want && isRedrafted) btn.click();
  }

  // Per-scene step config. Step 0 reuses the scene's original prompt text.
  const CFG = {
    threat: [
      { fire: () => window.__threatSetMode && window.__threatSetMode("ai", true) },
      {
        html: '<div class="micro"><b>The more you use AI, the more it threatens.</b> Threat perception climbs from 10% among non-users to 21% among daily-agent users — so the developers leaning hardest on AI sit highest on this axis.</div>',
        fire: () => window.__threatSetMode && window.__threatSetMode("ai", true),
      },
      {
        html: '<div class="micro"><b>But the pay is the same.</b> Swap the Y axis to salary and the three clouds drop into line — within one country, the threatened and the calm earn the same. The fear is psychological, not financial.</div>',
        fire: () => window.__threatSetMode && window.__threatSetMode("salary", true),
      },
    ],
    pay: [
      { fire: () => click('#pay [data-view="gap"]') },
      {
        html: '<div class="micro"><b>Watch the gap widen.</b> 2023 → 2025, AI users pull ahead of non-users in most countries.</div>',
        fire: () => click("#pay-play"),
      },
      {
        html: '<div class="micro"><b>Adoption is catching up from below.</b> Lower-income markets now show the highest daily-AI use.</div>',
        fire: () => click('#pay [data-view="catch"]'),
      },
    ],
    verify: [
      { fire: () => click('#vf [data-view="atrophy"]') },
      {
        html: '<div class="micro"><b>Trust has a task boundary.</b> Developers let AI search and draft, but hold the line on review, planning, and deployment.</div>',
        fire: () => click('#vf [data-view="trust"]'),
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
    next: [
      { fire: () => setRedraft(false) },
      {
        html: '<div class="micro"><b>Redraft for the AI era.</b> Re-weight popularity, momentum, and AI-fit — the board reshuffles toward what still pays.</div>',
        fire: () => setRedraft(true),
      },
    ],
  };

  const stepActions = [];

  Object.keys(CFG).forEach((id) => {
    const scene = document.getElementById(id);
    if (!scene) return;
    const viz = scene.querySelector(".viz-card");
    const prompt = scene.querySelector(".prompt");
    const promptHTML = prompt ? prompt.innerHTML : "";
    if (!viz) return;

    const graphic = document.createElement("div");
    graphic.className = "graphic";
    graphic.appendChild(viz); // move the rendered chart (SVG + handlers preserved)

    const col = document.createElement("div");
    col.className = "steps";
    CFG[id].forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "step";
      d.innerHTML = (i === 0 ? promptHTML : "") + (s.html || "");
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
