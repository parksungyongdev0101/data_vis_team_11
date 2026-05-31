"""Generate all Q2 visualization JSON files (viz/data/q2_*.json).

One function per scene in Q2_VIZ_PLAN.md. All salary figures use medians within the
[1000, 500000] USD ConvertedCompYearly filter. Run: python3 scripts/gen_q2_viz.py
"""
import csv, json, sys, os, statistics
from collections import defaultdict, Counter

csv.field_size_limit(sys.maxsize)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SO = os.path.join(BASE, "data", "stackoverflow")
OUT = os.path.join(BASE, "viz", "data")
os.makedirs(OUT, exist_ok=True)

YEARS = ["2023", "2024", "2025"]
DAILY = "Yes, I use AI tools daily"
NEVER = "No, and I don't plan to"
US = "United States of America"

HIGH_INCOME = {
    "United States of America", "Germany",
    "United Kingdom of Great Britain and Northern Ireland",
    "France", "Canada", "Netherlands", "Australia", "Sweden",
    "Switzerland", "Italy", "Spain", "Japan", "Austria", "Belgium",
    "Denmark", "Finland", "Norway", "Ireland", "Israel",
    "New Zealand", "Singapore", "South Korea", "Portugal",
    "Czech Republic", "Poland",
}


def is_ai_user(r, year):
    """AI user = any frequency. Consistent across years (2023/24 only had Yes/No)."""
    v = r.get("AISelect", "")
    return v == "Yes" if year != "2025" else v.startswith("Yes")


def load(year):
    with open(os.path.join(SO, year, "results.csv"), encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def comp(r):
    v = r.get("ConvertedCompYearly", "")
    try:
        c = float(v)
    except (ValueError, TypeError):
        return None
    return c if 1000 <= c <= 500000 else None


def workexp(r):
    try:
        return float(r.get("WorkExp", ""))
    except (ValueError, TypeError):
        return None


def exp_bucket(y):
    if y is None:
        return None
    if y <= 2:  return "0-2"
    if y <= 5:  return "3-5"
    if y <= 10: return "6-10"
    if y <= 15: return "11-15"
    if y <= 20: return "16-20"
    return "21+"


EXP_ORDER = ["0-2", "3-5", "6-10", "11-15", "16-20", "21+"]


def med(xs):
    return int(statistics.median(xs)) if xs else None


def pct(num, den, d=1):
    return round(100 * num / den, d) if den else None


def write(name, obj):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, ensure_ascii=False)
    print(f"  wrote {name}")


# ── Scene 1: temporal trends 2023-2025 ──────────────────────────────
def gen_temporal():
    out = {"years": YEARS, "series": {}}
    rows_by_year = {y: load(y) for y in YEARS}
    metrics = {}
    for y in YEARS:
        rows = rows_by_year[y]
        use = ut = noplan = 0
        fav = unf = st = 0
        tr = dis = tt = 0
        ty = tht = 0
        sent = Counter()
        for r in rows:
            v = r.get("AISelect", "")
            if v and v != "NA":
                ut += 1
                if v.startswith("Yes"):
                    use += 1
                if v == NEVER:
                    noplan += 1
            s = r.get("AISent", "")
            if s not in ("NA", "", "Unsure"):
                st += 1
                sent[s] += 1
                if s in ("Favorable", "Very favorable"):
                    fav += 1
                elif s in ("Unfavorable", "Very unfavorable"):
                    unf += 1
            a = r.get("AIAcc", "")
            if a in ("Somewhat trust", "Highly trust", "Neither trust nor distrust",
                     "Somewhat distrust", "Highly distrust"):
                tt += 1
                if a in ("Somewhat trust", "Highly trust"):
                    tr += 1
                elif a in ("Somewhat distrust", "Highly distrust"):
                    dis += 1
            th = r.get("AIThreat", "")
            if th in ("Yes", "No", "I'm not sure"):
                tht += 1
                if th == "Yes":
                    ty += 1
        SENT5 = ["Very favorable", "Favorable", "Indifferent", "Unfavorable", "Very unfavorable"]
        metrics[y] = {
            "using": pct(use, ut), "noplan": pct(noplan, ut),
            "favorable": pct(fav, st), "unfavorable": pct(unf, st),
            "trust": pct(tr, tt), "distrust": pct(dis, tt),
            "threat": pct(ty, tht) if tht else None,
            "n": len(rows),
            "sent_dist": {k: pct(sent[k], st) for k in SENT5},
        }
    for key in ["using", "noplan", "favorable", "unfavorable", "trust", "distrust", "threat"]:
        out["series"][key] = [metrics[y][key] for y in YEARS]
    # sentiment distribution (for the diverging "river"): each category -> [2023,2024,2025]
    out["sentiment"] = {k: [metrics[y]["sent_dist"][k] for y in YEARS]
                        for k in ["Very favorable", "Favorable", "Indifferent", "Unfavorable", "Very unfavorable"]}
    out["n"] = [metrics[y]["n"] for y in YEARS]
    write("q2_temporal.json", out)


# ── Scene 2: the Simpson's paradox reveal ───────────────────────────
def gen_premium():
    rows = load("2025")
    by_country = defaultdict(lambda: {"d": [], "n": []})
    for r in rows:
        c = comp(r)
        if c is None:
            continue
        ai = r.get("AISelect", "")
        cy = r.get("Country", "")
        if ai == DAILY:
            by_country[cy]["d"].append(c)
        elif ai == NEVER:
            by_country[cy]["n"].append(c)

    countries = []
    all_d, all_n = [], []
    for cy, d in by_country.items():
        all_d += d["d"]
        all_n += d["n"]
        if len(d["d"]) >= 30 and len(d["n"]) >= 30:
            md, mn = med(d["d"]), med(d["n"])
            countries.append({
                "country": cy,
                "daily_med": md, "never_med": mn,
                "premium": round(100 * (md / mn - 1), 1),
                "n_d": len(d["d"]), "n_n": len(d["n"]),
            })
    countries.sort(key=lambda x: -x["premium"])

    # USA by experience bucket
    usa = defaultdict(lambda: {"d": [], "n": []})
    for r in rows:
        if r.get("Country") != US:
            continue
        c = comp(r)
        b = exp_bucket(workexp(r))
        if c is None or b is None:
            continue
        ai = r.get("AISelect", "")
        if ai == DAILY:
            usa[b]["d"].append(c)
        elif ai == NEVER:
            usa[b]["n"].append(c)
    usa_by_exp = []
    for b in EXP_ORDER:
        d = usa[b]
        md, mn = med(d["d"]), med(d["n"])
        if md and mn:
            usa_by_exp.append({
                "bucket": b, "daily_med": md, "never_med": mn,
                "premium": round(100 * (md / mn - 1), 1),
                "n_d": len(d["d"]), "n_n": len(d["n"]),
            })

    gmd, gmn = med(all_d), med(all_n)
    out = {
        "global": {
            "daily_med": gmd, "never_med": gmn,
            "premium": round(100 * (gmd / gmn - 1), 1),
            "n_d": len(all_d), "n_n": len(all_n),
        },
        "median_premium": round(statistics.median([c["premium"] for c in countries]), 1),
        "n_positive": sum(1 for c in countries if c["premium"] > 0),
        "n_countries": len(countries),
        "countries": countries,
        "usa_by_exp": usa_by_exp,
    }
    write("q2_premium.json", out)


# ── Scene 3: catch-up bet (income vs adoption) ──────────────────────
def gen_country():
    rows = load("2025")
    agg = defaultdict(lambda: {"daily": 0, "ai_tot": 0, "comp": []})
    for r in rows:
        cy = r.get("Country", "")
        ai = r.get("AISelect", "")
        if ai and ai != "NA":
            agg[cy]["ai_tot"] += 1
            if ai == DAILY:
                agg[cy]["daily"] += 1
        c = comp(r)
        if c is not None:
            agg[cy]["comp"].append(c)
    out = []
    for cy, d in agg.items():
        if d["ai_tot"] >= 300 and len(d["comp"]) >= 100:
            out.append({
                "country": cy,
                "median_comp": med(d["comp"]),
                "ai_daily_pct": pct(d["daily"], d["ai_tot"]),
                "n": d["ai_tot"],
            })
    out.sort(key=lambda x: -x["median_comp"])
    write("q2_country.json", out)


# ── Scene 4: exposure paradox ───────────────────────────────────────
def gen_exposure():
    rows = load("2025")
    labels = {
        "Yes, I use AI agents at work daily": "Agents daily",
        "Yes, I use AI agents at work weekly": "Agents weekly",
        "Yes, I use AI agents at work monthly or infrequently": "Agents monthly",
        "No, I use AI exclusively in copilot/autocomplete mode": "Copilot only",
        "No, but I plan to": "Plan to use",
        "No, and I don't plan to": "No plan",
    }
    order = ["Agents daily", "Agents weekly", "Agents monthly", "Copilot only", "Plan to use", "No plan"]
    lvl = defaultdict(lambda: {"yes": 0, "tot": 0})
    for r in rows:
        a = r.get("AIAgents", "")
        t = r.get("AIThreat", "")
        if a not in labels or t not in ("Yes", "No", "I'm not sure"):
            continue
        lvl[labels[a]]["tot"] += 1
        if t == "Yes":
            lvl[labels[a]]["yes"] += 1
    levels = [{"level": k, "threat_pct": pct(lvl[k]["yes"], lvl[k]["tot"]), "n": lvl[k]["tot"]}
              for k in order if lvl[k]["tot"]]

    # pay (and jobsat) by threat, within USA to control country
    pay = defaultdict(lambda: {"comp": [], "js": []})
    for r in rows:
        if r.get("Country") != US:
            continue
        t = r.get("AIThreat", "")
        if t not in ("Yes", "No", "I'm not sure"):
            continue
        c = comp(r)
        if c is not None:
            pay[t]["comp"].append(c)
        try:
            pay[t]["js"].append(float(r.get("JobSat", "")))
        except (ValueError, TypeError):
            pass
    tmap = {"Yes": "Feel threatened", "No": "Not threatened", "I'm not sure": "Unsure"}
    pay_by_threat = [{"threat": tmap[t], "median_comp": med(pay[t]["comp"]),
                      "jobsat": round(statistics.median(pay[t]["js"]), 1) if pay[t]["js"] else None,
                      "n": len(pay[t]["comp"])}
                     for t in ["Yes", "No", "I'm not sure"]]
    # per-respondent salary points for the beeswarm (USA, sampled so the swarm stays light)
    import random
    random.seed(11)
    points = {}
    for t in ["Yes", "No", "I'm not sure"]:
        c = pay[t]["comp"]
        points[tmap[t]] = sorted(random.sample(c, 320)) if len(c) > 320 else sorted(c)
    write("q2_exposure.json", {"levels": levels, "pay_by_threat": pay_by_threat, "points": points})


# ── Scene 5: trust boundary (task automation) ───────────────────────
def gen_tasks():
    rows = load("2025")
    cols = {
        "mostly": "AIToolCurrently mostly AI",
        "partial": "AIToolCurrently partially AI",
        "plan_m": "AIToolPlan to mostly use AI",
        "plan_p": "AIToolPlan to partially use AI",
        "refused": "AIToolDon't plan to use AI for this task",
    }
    ctr = {k: Counter() for k in cols}
    for r in rows:
        for k, col in cols.items():
            for t in (r.get(col, "") or "").split(";"):
                t = t.strip()
                if t and t != "NA" and "Other" not in t:
                    ctr[k][t] += 1
    tasks = set().union(*[set(c) for c in ctr.values()])
    out = []
    for t in tasks:
        m, p = ctr["mostly"][t], ctr["partial"][t]
        pl = ctr["plan_m"][t] + ctr["plan_p"][t]
        rf = ctr["refused"][t]
        tot = m + p + pl + rf
        if not tot:
            continue
        out.append({
            "task": t,
            "now": round(100 * (m + p) / tot, 1),
            "mostly": round(100 * m / tot, 1),
            "planned": round(100 * pl / tot, 1),
            "refused": round(100 * rf / tot, 1),
            "n": tot,
        })
    out.sort(key=lambda x: -x["now"])
    write("q2_tasks.json", out)


# ── Scene 6: atrophy gradient ───────────────────────────────────────
def gen_atrophy():
    rows = load("2025")
    fr = defaultdict(lambda: {"n": 0, "atrophy": 0, "debug": 0, "almost": 0})
    for r in rows:
        b = exp_bucket(workexp(r))
        v = r.get("AIFrustration", "") or ""
        if b is None or v in ("NA", ""):
            continue
        fr[b]["n"] += 1
        if "less confident" in v:
            fr[b]["atrophy"] += 1
        if "Debugging AI" in v:
            fr[b]["debug"] += 1
        if "almost right" in v:
            fr[b]["almost"] += 1
    out = [{"bucket": b, "atrophy": pct(fr[b]["atrophy"], fr[b]["n"]),
            "debug": pct(fr[b]["debug"], fr[b]["n"]),
            "almost": pct(fr[b]["almost"], fr[b]["n"]), "n": fr[b]["n"]}
           for b in EXP_ORDER if fr[b]["n"]]
    write("q2_atrophy.json", out)


# ── Scene 7: adoption divide ────────────────────────────────────────
def gen_divide():
    rows = load("2025")

    def share(field, minn=200, splitmulti=False):
        agg = defaultdict(lambda: [0, 0])
        for r in rows:
            vals = []
            raw = r.get(field, "")
            if not raw or raw == "NA":
                continue
            vals = [x.strip() for x in raw.split(";")] if splitmulti else [raw]
            ai = r.get("AISelect", "")
            if not ai or ai == "NA":
                continue
            for v in vals:
                if not v or "Other" in v:
                    continue
                agg[v][1] += 1
                if ai == DAILY:
                    agg[v][0] += 1
        out = [{"label": k, "pct": round(100 * d[0] / d[1], 1), "n": d[1]}
               for k, d in agg.items() if d[1] >= minn]
        out.sort(key=lambda x: -x["pct"])
        return out

    role = share("DevType", minn=300, splitmulti=True)
    age = share("Age", minn=200)
    # keep age in canonical order
    age_order = ["Under 18 years old", "18-24 years old", "25-34 years old",
                 "35-44 years old", "45-54 years old", "55-64 years old", "65 years or older"]
    age = [a for o in age_order for a in age if a["label"] == o]
    # overall AI-daily baseline (reference line for the deviation dot-plot)
    bd = bt = 0
    for r in rows:
        ai = r.get("AISelect", "")
        if ai and ai != "NA":
            bt += 1
            if ai == DAILY:
                bd += 1
    write("q2_divide.json", {
        "baseline": pct(bd, bt),
        "industry": share("Industry"),
        "orgsize": share("OrgSize"),
        "role": role,
        "age": age,
    })


# ── Scene 2 (NEW): country bubbles over years ───────────────────────
# Each country, each year: typical pay (median all devs), AI-user vs non-user
# pay gap %, #devs, income tier. "AI user" = any frequency (consistent across years).
def gen_country_years():
    NORM = {"Republic of Korea": "South Korea", "Republic of Moldova": "Moldova"}
    by_country = defaultdict(lambda: {y: {"all": [], "users": [], "non": []} for y in YEARS})
    for year in YEARS:
        for r in load(year):
            c = comp(r)
            if c is None:
                continue
            cy = r.get("Country", "")
            cy = NORM.get(cy, cy)
            d = by_country[cy][year]
            d["all"].append(c)
            if is_ai_user(r, year):
                d["users"].append(c)
            elif r.get("AISelect", "") == NEVER:
                d["non"].append(c)

    out = []
    for cy, yrs in by_country.items():
        rec = {"country": cy, "tier": "high" if cy in HIGH_INCOME else "low", "years": {}}
        ok = True
        for y in YEARS:
            d = yrs[y]
            if len(d["all"]) < 40 or len(d["users"]) < 15 or len(d["non"]) < 12:
                ok = False
                break
            mu, mn = med(d["users"]), med(d["non"])
            rec["years"][y] = {
                "pay": med(d["all"]),
                "gap": round(100 * (mu / mn - 1), 1),
                "n": len(d["all"]),
            }
        if ok:
            out.append(rec)
    out.sort(key=lambda r: -r["years"]["2025"]["n"])

    # global pooled gap per year (the Simpson's-paradox reference marker)
    pooled = {}
    for year in YEARS:
        rows = load(year)
        u, nn = [], []
        for r in rows:
            c = comp(r)
            if c is None:
                continue
            if is_ai_user(r, year):
                u.append(c)
            elif r.get("AISelect", "") == NEVER:
                nn.append(c)
        pooled[year] = round(100 * (med(u) / med(nn) - 1), 1)
    write("q2_country_years.json", {"countries": out, "pooled": pooled, "years": YEARS})


# ── Scene 8: explore bubbles (role x experience) ────────────────────
def gen_groups():
    rows = load("2025")
    grp = defaultdict(lambda: {"daily": 0, "ai_tot": 0, "ty": 0, "tt": 0, "comp": []})
    for r in rows:
        dv = r.get("DevType", "")
        if not dv or dv == "NA":
            continue
        b = exp_bucket(workexp(r))
        if b is None:
            continue
        ai = r.get("AISelect", "")
        th = r.get("AIThreat", "")
        c = comp(r)
        for role in [x.strip() for x in dv.split(";")]:
            if "Other" in role or not role:
                continue
            key = (role, b)
            g = grp[key]
            if ai and ai != "NA":
                g["ai_tot"] += 1
                if ai == DAILY:
                    g["daily"] += 1
            if th in ("Yes", "No", "I'm not sure"):
                g["tt"] += 1
                if th == "Yes":
                    g["ty"] += 1
            if c is not None:
                g["comp"].append(c)
    out = []
    for (role, b), g in grp.items():
        if g["ai_tot"] < 30:
            continue
        out.append({
            "role": role, "exp": b,
            "median_comp": med(g["comp"]),
            "ai_daily": pct(g["daily"], g["ai_tot"]),
            "threat": pct(g["ty"], g["tt"]) if g["tt"] else None,
            "n": g["ai_tot"],
        })
    out.sort(key=lambda x: -x["n"])
    write("q2_groups.json", {"groups": out, "exp_order": EXP_ORDER})


if __name__ == "__main__":
    print("Generating Q2 viz data...")
    gen_temporal()
    gen_premium()
    gen_country()
    gen_exposure()
    gen_tasks()
    gen_atrophy()
    gen_divide()
    gen_country_years()
    gen_groups()
    print("Done.")
