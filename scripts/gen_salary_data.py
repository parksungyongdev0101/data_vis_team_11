"""Build a compact per-respondent pool for the interactive salary estimator.

Output: viz/data/salary_pool.json
  { countries:[...], roles:[...], langs:[...], edus:[...], ais:[...],
    rows: [ [countryIdx, exp|null, [roleIdx...], [langIdx...], eduIdx|null, aiIdx|null, comp], ... ] }
Only rows with a valid ConvertedCompYearly in [1000, 500000] are included.
Run: python3 scripts/gen_salary_data.py
"""
import csv, json, sys, os
from collections import Counter

csv.field_size_limit(sys.maxsize)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "data", "stackoverflow", "2025", "results.csv")
OUT = os.path.join(BASE, "viz", "data", "salary_pool.json")

# curated language vocabulary (popular + course-relevant)
LANGS = ["JavaScript", "TypeScript", "Python", "HTML/CSS", "SQL", "Java", "C#", "C++",
         "C", "Go", "Rust", "PHP", "Ruby", "Kotlin", "Swift", "Dart", "Bash/Shell (all shells)",
         "PowerShell", "R", "Scala", "Elixir", "Lua", "MATLAB", "Assembly", "GDScript",
         "Perl", "Groovy", "Visual Basic (.Net)"]
LANG_LABEL = {"Bash/Shell (all shells)": "Bash/Shell", "Visual Basic (.Net)": "Visual Basic"}

EDU_MAP = {
    "Bachelor’s degree (B.A., B.S., B.Eng., etc.)": "Bachelor's",
    "Master’s degree (M.A., M.S., M.Eng., MBA, etc.)": "Master's",
    "Professional degree (JD, MD, Ph.D, Ed.D, etc.)": "PhD / Professional",
    "Associate degree (A.A., A.S., etc.)": "Associate",
    "Some college/university study without earning a degree": "Some college",
    "Secondary school (e.g. American high school, Germany, Realschule or Gymnasium, etc.)": "Secondary school",
    "Primary/elementary school": "Primary school",
}
AIS = ["none", "user", "daily"]   # 0 non-user, 1 occasional user, 2 daily

# the survey splits a few countries across two labels — canonicalize so samples merge.
# (Note: "Congo, Republic of the..." and "Democratic Republic of the Congo" are NOT
#  merged — they are two genuinely different countries.)
COUNTRY_NORM = {
    "Republic of Korea": "South Korea",
    "Republic of Moldova": "Moldova",
    "Democratic People's Republic of Korea": "North Korea",
}
MIN_COUNTRY = 30   # min valid-comp respondents for a country to appear in the dropdown


def country(r):
    c = r.get("Country", "")
    return COUNTRY_NORM.get(c, c)


def comp(r):
    try:
        c = float(r.get("ConvertedCompYearly", ""))
    except (ValueError, TypeError):
        return None
    return int(c) if 1000 <= c <= 500000 else None


def main():
    rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))
    valid = [r for r in rows if comp(r) is not None]

    # country vocab: keep countries with enough valid-comp respondents (names merged)
    cc = Counter(country(r) for r in valid)
    countries = sorted([c for c, n in cc.items() if n >= MIN_COUNTRY and c and c != "NA"],
                       key=lambda c: -cc[c])
    cidx = {c: i for i, c in enumerate(countries)}

    # role vocab from DevType (exclude "Other"); keep roles appearing >=80 times
    rc = Counter()
    for r in valid:
        for role in [x.strip() for x in (r.get("DevType", "") or "").split(";")]:
            if role and "Other" not in role and role != "NA":
                rc[role] += 1
    roles = sorted([r for r, n in rc.items() if n >= 80], key=lambda r: -rc[r])
    ridx = {r: i for i, r in enumerate(roles)}

    lidx = {l: i for i, l in enumerate(LANGS)}
    edus = ["Bachelor's", "Master's", "PhD / Professional", "Associate",
            "Some college", "Secondary school", "Primary school"]
    eidx = {e: i for i, e in enumerate(edus)}

    out_rows = []
    for r in valid:
        ci = cidx.get(country(r))
        if ci is None:
            continue  # skip tiny-sample countries (kept honest)
        try:
            exp = int(float(r.get("WorkExp", "")))
        except (ValueError, TypeError):
            exp = None
        rls = sorted({ridx[x.strip()] for x in (r.get("DevType", "") or "").split(";")
                      if x.strip() in ridx})
        lgs = sorted({lidx[x.strip()] for x in (r.get("LanguageHaveWorkedWith", "") or "").split(";")
                      if x.strip() in lidx})
        ei = eidx.get(EDU_MAP.get(r.get("EdLevel", "")))
        sel = r.get("AISelect", "")
        if sel == "Yes, I use AI tools daily":
            ai = 2
        elif sel.startswith("Yes"):
            ai = 1
        elif sel in ("No, and I don't plan to", "No, but I plan to soon"):
            ai = 0
        else:
            ai = None
        out_rows.append([ci, exp, rls, lgs, ei, ai, comp(r)])

    obj = {
        "countries": countries,
        "roles": roles,
        "langs": [LANG_LABEL.get(l, l) for l in LANGS],
        "edus": edus,
        "ais": AIS,
        "rows": out_rows,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    sz = os.path.getsize(OUT)
    print(f"wrote {OUT}: {len(out_rows)} rows, {len(countries)} countries, "
          f"{len(roles)} roles, {len(LANGS)} langs, {sz/1024:.0f} KB")


if __name__ == "__main__":
    main()
