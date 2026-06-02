#!/usr/bin/env python3
"""Build clustered AIOpen data for aiopen_network.html.

Usage:
  python3 sohyoeun/build_aiopen_clusters.py --input survey_results_public.csv

If no input CSV is provided, the script uses a small embedded demo set so the
visualization can be tested without the Stack Overflow raw data file.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.metrics import pairwise_distances


ROLES = [
    {"id": "fs", "name": "Full-stack"},
    {"id": "be", "name": "Back-end"},
    {"id": "fe", "name": "Front-end"},
    {"id": "mob", "name": "Mobile"},
    {"id": "data", "name": "Data/ML"},
    {"id": "devops", "name": "DevOps"},
    {"id": "emb", "name": "Embedded"},
    {"id": "mgr", "name": "Manager"},
]

BUCKETS = [[0, 2], [2, 5], [5, 10], [10, 20], [20, 30]]

CATS = [
    {"id": "problem", "name": "Problem Solving", "color": "#f97316"},
    {"id": "design", "name": "System Design", "color": "#4e9af1"},
    {"id": "comm", "name": "Communication", "color": "#a78bfa"},
    {"id": "domain", "name": "Domain Sense", "color": "#34d399"},
    {"id": "fund", "name": "CS Fundamentals", "color": "#facc15"},
    {"id": "ai", "name": "AI Fluency", "color": "#ec4899"},
    {"id": "adapt", "name": "Adaptability", "color": "#22d3ee"},
]

CATEGORY_KEYWORDS = {
    "problem": {
        "problem", "solve", "solving", "debug", "debugging", "reasoning",
        "critical", "think", "thinking", "decompose", "logic", "judgment",
        "analysis", "analytical", "decision",
    },
    "design": {
        "architecture", "architectural", "system", "systems", "design",
        "scale", "scaling", "scalability", "performance", "tradeoff",
        "tradeoffs", "maintainability", "reliability", "distributed",
    },
    "comm": {
        "communication", "communicate", "collaboration", "collaborate",
        "team", "stakeholder", "requirements", "mentor", "mentoring",
        "feedback", "review", "explain", "leadership",
    },
    "domain": {
        "domain", "business", "product", "user", "users", "customer",
        "customers", "industry", "context", "requirements", "regulation",
        "regulatory", "workflow",
    },
    "fund": {
        "algorithm", "algorithms", "data", "structures", "computer",
        "science", "network", "networking", "operating", "database",
        "security", "fundamentals", "complexity",
    },
    "ai": {
        "ai", "model", "models", "llm", "prompt", "prompting",
        "verify", "verification", "validate", "hallucination", "tool",
        "tools", "automation", "generated",
    },
    "adapt": {
        "learn", "learning", "adapt", "adaptability", "curiosity",
        "curious", "change", "flexibility", "continuous", "new",
        "growth", "resilience",
    },
}

CATEGORY_PATTERNS = {
    "design": [
        (6, r"\b(system|systems)\s+design\b"),
        (6, r"\barchitecture|architectural|architect\b"),
        (5, r"\bscalability|scalable|scaling\b"),
        (5, r"\bperformance|latency|reliability\b"),
        (5, r"\bmaintainability|maintainable\b"),
        (4, r"\btrade-?offs?\b"),
        (4, r"\bdesign patterns?\b"),
    ],
    "comm": [
        (7, r"\bsoft skills?\b"),
        (6, r"\bcommunication|communicate|communicating\b"),
        (5, r"\bcollaboration|collaborate|teamwork\b"),
        (5, r"\bstakeholders?\b"),
        (5, r"\bmentors?|mentoring|teaching\b"),
        (4, r"\bleadership|management\b"),
        (4, r"\bempathy|people skills?\b"),
        (3, r"\brequirements?\b"),
    ],
    "domain": [
        (7, r"\bdomain\s+(knowledge|expertise|understanding)\b"),
        (6, r"\bbusiness\s+(logic|knowledge|requirements?|understanding|domain)\b"),
        (6, r"\bproduct\s+(sense|thinking|knowledge|management)\b"),
        (5, r"\busers?|customers?|clients?\b"),
        (5, r"\bindustry|context|workflow\b"),
        (4, r"\bregulation|regulatory|compliance\b"),
    ],
    "fund": [
        (7, r"\bdata structures?\b"),
        (6, r"\balgorithms?\b"),
        (6, r"\bfundamentals?\b"),
        (5, r"\bcomputer science|cs\b"),
        (5, r"\bnetworking?|operating systems?|os\b"),
        (5, r"\bsecurity|cybersecurity\b"),
        (4, r"\btesting|test design\b"),
        (4, r"\bdatabases?\b"),
    ],
    "ai": [
        (7, r"\bprompt(ing|s)?|prompt engineering\b"),
        (6, r"\bllms?|language models?\b"),
        (6, r"\bhallucination|hallucinations\b"),
        (6, r"\bverify(ing)?\s+(ai|generated)|validat(e|ing)\s+(ai|generated)\b"),
        (5, r"\bai\s+(output|tools?|systems?|models?|limitations?|agents?)\b"),
        (5, r"\bgenerated\s+(code|output)\b"),
        (4, r"\bautomation\b"),
    ],
    "adapt": [
        (7, r"\blearning\s+new|learn\s+new\b"),
        (6, r"\bcontinuous\s+learning|lifelong\s+learning\b"),
        (6, r"\badaptability|adapt|adapting\b"),
        (5, r"\bcuriosity|curious\b"),
        (5, r"\bflexibility|flexible\b"),
        (4, r"\bkeep\s+up|change|changing\b"),
    ],
    "problem": [
        (7, r"\bproblem\s+solving\b"),
        (6, r"\bdebugging|debug|troubleshooting\b"),
        (6, r"\bcritical\s+thinking\b"),
        (5, r"\blogical\s+thinking|analytical\s+thinking|reasoning\b"),
        (5, r"\bcreativity|creative|innovation\b"),
        (4, r"\bdecompos(e|ing|ition)\b"),
        (4, r"\bjudgment|decision making\b"),
    ],
}

LABEL_RULES = [
    ("debug", "Debugging Reasoning", {"debug", "debugging", "bug", "bugs", "root", "cause"}),
    ("critical", "Critical Thinking", {"critical", "judgment", "judge", "reasoning", "evaluate"}),
    ("complexps", "Complex Problem Solving", {"complex", "problems", "solutions"}),
    ("analysis", "Problem Analysis", {"analysis", "analytical"}),
    ("decompose", "Problem Decomposition", {"decompose", "break", "problem", "solving", "logic"}),
    ("creative", "Creativity", {"creative", "creativity", "innovation", "ingenuity"}),
    ("planning", "Planning & Judgment", {"planning", "project", "decision"}),
    ("arch", "Architecture", {"architecture", "architectural", "system", "systems", "design"}),
    ("highlevel", "High-Level Design", {"level", "high", "low", "abstraction"}),
    ("maintain", "Maintainability", {"maintainable", "maintainability", "clean", "readable"}),
    ("tradeoff", "Tradeoff Judgment", {"tradeoff", "tradeoffs", "cost", "latency", "maintainability"}),
    ("scale", "Scalability & Performance", {"scale", "scaling", "scalability", "performance", "reliability"}),
    ("soft", "Soft Skills", {"soft", "people", "empathy"}),
    ("stakeholder", "Stakeholder Communication", {"stakeholder", "stakeholders", "communication", "communicate"}),
    ("requirements", "Requirements Translation", {"requirements", "stakeholder", "communicate", "communication", "customer"}),
    ("review", "Review & Feedback", {"review", "feedback", "explain", "teach"}),
    ("mentor", "Mentoring", {"mentor", "mentoring", "leadership", "team"}),
    ("domainknow", "Domain Knowledge", {"domain", "industry", "business", "context", "regulation"}),
    ("product", "Product & User Sense", {"product", "user", "users", "ux", "customer"}),
    ("dsa", "Data Structures & Algorithms", {"algorithm", "algorithms", "structures", "complexity"}),
    ("security", "Security", {"security", "cybersecurity", "privacy"}),
    ("testing", "Testing", {"testing", "test", "tests"}),
    ("systems", "Systems Fundamentals", {"operating", "network", "networking", "database", "security"}),
    ("prompt", "Prompting", {"prompt", "prompting", "instruction", "direct"}),
    ("skeptic", "AI Skepticism", {"don", "believe", "replace"}),
    ("generated", "Generated Code Review", {"generated", "output", "development"}),
    ("human", "Human Oversight", {"human", "humans", "replace", "oversight"}),
    ("verify", "AI Output Verification", {"verify", "verification", "validate", "hallucination", "generated"}),
    ("limits", "AI Limits", {"limits", "limitations", "wrong", "trust", "model"}),
    ("learn", "Fast Learning", {"learn", "learning", "continuous", "new", "change"}),
    ("curious", "Curiosity & Adaptation", {"curiosity", "curious", "adapt", "adaptability", "flexibility"}),
]

LABEL_TO_CATEGORY = {
    "debug": "problem",
    "critical": "problem",
    "decompose": "problem",
    "arch": "design",
    "tradeoff": "design",
    "scale": "design",
    "requirements": "comm",
    "review": "comm",
    "mentor": "comm",
    "domainknow": "domain",
    "product": "domain",
    "dsa": "fund",
    "systems": "fund",
    "prompt": "ai",
    "verify": "ai",
    "limits": "ai",
    "learn": "adapt",
    "curious": "adapt",
}

CATEGORY_LABEL_IDS = {
    "problem": {"debug", "critical", "complexps", "analysis", "decompose", "creative", "planning"},
    "design": {"arch", "highlevel", "maintain", "tradeoff", "scale", "planning"},
    "comm": {"soft", "stakeholder", "requirements", "review", "mentor"},
    "domain": {"domainknow", "product"},
    "fund": {"dsa", "security", "testing", "systems"},
    "ai": {"prompt", "skeptic", "generated", "human", "verify", "limits"},
    "adapt": {"learn", "curious"},
}

EXTRA_STOPWORDS = {
    "ai", "developer", "developers", "skill", "skills", "ability", "abilities",
    "tools", "tool", "use", "using", "need", "needs", "capable", "valuable",
    "remain", "years", "work", "working", "code", "coding", "software",
}

DEMO_ROWS = [
    ("AI can write functions, but breaking a vague business problem into solvable pieces is still on me.", "Developer, full-stack", "7"),
    ("Critical thinking, especially knowing when an AI answer is plausible but wrong.", "Data scientist or machine learning specialist", "9"),
    ("Debugging complex production issues and tracing cause and effect across services.", "Developer, back-end", "12"),
    ("Understanding algorithms and complexity well enough to review generated code.", "Developer, back-end", "5"),
    ("System architecture and choosing boundaries that survive five years of product changes.", "Developer, back-end", "16"),
    ("Making tradeoffs between cost, latency, reliability, and maintainability.", "DevOps specialist", "10"),
    ("Designing scalable systems before the first generated implementation exists.", "Cloud infrastructure engineer", "13"),
    ("Communication with stakeholders to turn fuzzy needs into buildable requirements.", "Developer, full-stack", "8"),
    ("Giving code review feedback that teaches judgment, not just syntax fixes.", "Engineering manager", "15"),
    ("Mentoring junior engineers so they learn why a solution is good or risky.", "Engineering manager", "20"),
    ("Deep domain knowledge of the business and its strange rules.", "Developer, back-end", "11"),
    ("Product sense and understanding what users actually need.", "Developer, front-end", "6"),
    ("Data structures, algorithms, and fundamentals never go away.", "Student", "2"),
    ("Operating systems, networking, databases, and security fundamentals.", "Embedded applications or devices developer", "14"),
    ("Prompting and instructing AI systems precisely enough to get useful drafts.", "Developer, full-stack", "4"),
    ("Verifying AI output with tests, domain checks, and careful reading.", "Data scientist or machine learning specialist", "8"),
    ("Knowing the limitations of LLMs and where hallucinations are likely.", "Developer, back-end", "18"),
    ("Fast learning because frameworks and AI tools keep changing.", "Developer, mobile", "5"),
    ("Curiosity and adaptability when the ground keeps shifting.", "Developer, front-end", "7"),
    ("Problem solving and logical reasoning are more important than memorizing syntax.", "Developer, back-end", "6"),
    ("Explaining technical risks to non-technical stakeholders.", "Engineering manager", "17"),
    ("Security fundamentals and knowing what generated code might expose.", "DevOps specialist", "9"),
    ("Customer empathy and product judgment about which feature should exist.", "Developer, front-end", "6"),
    ("Evaluating whether generated code is correct, safe, and maintainable.", "Developer, full-stack", "10"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="Stack Overflow survey CSV path")
    parser.add_argument("--output", type=Path, default=Path("sohyoeun/data/aiopen_clusters.js"))
    parser.add_argument("--text-col", default="AIOpen")
    parser.add_argument("--devtype-col", default="DevType")
    parser.add_argument("--years-col", default="YearsCodePro")
    parser.add_argument("--clusters", type=int, default=18)
    parser.add_argument("--max-rows", type=int, default=0, help="Optional sample limit for speed")
    parser.add_argument("--random-state", type=int, default=42)
    return parser.parse_args()


def normalize_text(text: object) -> str:
    text = "" if pd.isna(text) else str(text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^A-Za-z0-9+#.\- ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def is_meaningful(text: str) -> bool:
    if len(text) < 8:
        return False
    bad = {"none", "nothing", "no", "n/a", "na", "not sure", "idk", "dont know", "don't know"}
    return text not in bad


def parse_years(value: object) -> float | None:
    if pd.isna(value):
        return None
    text = str(value).strip()
    if text == "Less than 1 year":
        return 0.5
    if text == "More than 50 years":
        return 51.0
    match = re.search(r"\d+(?:\.\d+)?", text)
    return float(match.group()) if match else None


def map_role(devtype: object) -> str:
    text = "" if pd.isna(devtype) else str(devtype).lower()
    if "manager" in text or "executive" in text or "product manager" in text:
        return "mgr"
    if "data scientist" in text or "machine learning" in text or "data engineer" in text:
        return "data"
    if "devops" in text or "cloud" in text or "site reliability" in text:
        return "devops"
    if "embedded" in text:
        return "emb"
    if "mobile" in text or "android" in text or "ios" in text:
        return "mob"
    if "front-end" in text or "frontend" in text:
        return "fe"
    if "back-end" in text or "backend" in text:
        return "be"
    if "full-stack" in text or "full stack" in text:
        return "fs"
    return "fs"


def load_rows(args: argparse.Namespace) -> pd.DataFrame:
    if args.input and args.input.exists():
        usecols = [args.text_col]
        for col in [args.devtype_col, args.years_col]:
            if col not in usecols:
                usecols.append(col)
        df = pd.read_csv(args.input, usecols=lambda c: c in set(usecols), low_memory=False)
        missing = [col for col in [args.text_col] if col not in df.columns]
        if missing:
            raise ValueError(f"Missing required column(s): {', '.join(missing)}")
        if args.devtype_col not in df.columns:
            df[args.devtype_col] = ""
        if args.years_col not in df.columns:
            df[args.years_col] = np.nan
        source = str(args.input)
    else:
        df = pd.DataFrame(DEMO_ROWS, columns=[args.text_col, args.devtype_col, args.years_col])
        source = "embedded demo responses"

    df = df.rename(columns={
        args.text_col: "raw_text",
        args.devtype_col: "devtype",
        args.years_col: "years",
    })
    df["text"] = df["raw_text"].map(normalize_text)
    df = df[df["text"].map(is_meaningful)].copy()
    if args.max_rows and len(df) > args.max_rows:
        df = df.sample(args.max_rows, random_state=args.random_state)
    df["role"] = df["devtype"].map(map_role)
    df["years_num"] = df["years"].map(parse_years)
    df.attrs["source"] = source
    return df.reset_index(drop=True)


def choose_cluster_count(n_rows: int, requested: int) -> int:
    if n_rows < 4:
        return max(1, n_rows)
    if n_rows < 30:
        return max(2, min(requested, max(2, n_rows // 2), n_rows - 1))
    auto = max(8, int(round(math.sqrt(n_rows) * 1.5)))
    return max(2, min(requested, auto, n_rows - 1))


def top_terms_for_cluster(vectorizer: TfidfVectorizer, matrix, indices: np.ndarray, n: int = 8) -> list[str]:
    terms = np.array(vectorizer.get_feature_names_out())
    centroid = np.asarray(matrix[indices].mean(axis=0)).ravel()
    top = centroid.argsort()[::-1]
    return [terms[i] for i in top[:n] if centroid[i] > 0]


def pick_category(terms: list[str], texts: list[str]) -> str:
    joined = " ".join(terms + texts)
    tokens = set(re.findall(r"[a-z][a-z+#.\-]+", joined.lower()))
    scores = {
        cat: len(tokens & keys)
        for cat, keys in CATEGORY_KEYWORDS.items()
    }
    return max(scores.items(), key=lambda kv: kv[1])[0]


def classify_seed_category(text: str) -> str:
    scores = {cat: 0 for cat in CATEGORY_PATTERNS}
    for cat, patterns in CATEGORY_PATTERNS.items():
        for weight, pattern in patterns:
            scores[cat] += weight * len(re.findall(pattern, text))
    if max(scores.values()) > 0:
        return max(scores.items(), key=lambda kv: kv[1])[0]
    return pick_category([], [text])


def allocate_cluster_counts(counts: dict[str, int], requested: int) -> dict[str, int]:
    active = {cat: count for cat, count in counts.items() if count > 0}
    if not active:
        return {}
    total = max(len(active), requested)
    weights = {cat: math.sqrt(count) for cat, count in active.items()}
    weight_sum = sum(weights.values()) or 1
    alloc = {cat: 1 for cat in active}
    remaining = total - len(active)
    raw = {cat: weights[cat] / weight_sum * remaining for cat in active}
    for cat, extra in raw.items():
        alloc[cat] += int(extra)
    leftover = total - sum(alloc.values())
    for cat, _ in sorted(raw.items(), key=lambda kv: kv[1] - int(kv[1]), reverse=True)[:leftover]:
        alloc[cat] += 1
    return {cat: min(count, max(1, n)) for cat, n in alloc.items() for count in [active[cat]]}


def score_label_rules(rules: list[tuple[str, str, set[str]]], tokens: set[str]) -> tuple[str, str] | None:
    best = None
    best_score = 0
    for label_id, label, keys in rules:
        score = len(tokens & keys)
        if score > best_score:
            best = (label_id, label)
            best_score = score
    return best


def pick_label(cluster_id: int, terms: list[str], texts: list[str], cat: str | None = None) -> tuple[str, str]:
    tokens = set(terms)
    tokens.update(re.findall(r"[a-z][a-z+#.\-]+", " ".join(texts).lower()))
    if cat:
        preferred = [rule for rule in LABEL_RULES if rule[0] in CATEGORY_LABEL_IDS.get(cat, set())]
        best = score_label_rules(preferred, tokens)
        if best:
            return best
    best = score_label_rules(LABEL_RULES, tokens)
    if best:
        return best
    label = " · ".join(t.replace("_", " ") for t in terms[:2]) or f"Cluster {cluster_id + 1}"
    return f"cluster_{cluster_id + 1}", label.title()


def exp_weights(years: pd.Series) -> list[float]:
    counts = []
    clean = years.dropna()
    for start, end in BUCKETS:
        counts.append(int(((clean >= start) & (clean < end)).sum()))
    if sum(counts) == 0:
        return [0.2] * len(BUCKETS)
    total = sum(counts)
    return [round(c / total, 4) for c in counts]


def role_emphasis(roles: pd.Series) -> list[str]:
    counts = Counter(roles)
    if not counts:
        return ["fs"]
    return [role for role, _ in counts.most_common(3)]


def representative_quotes(df_cluster: pd.DataFrame, matrix, cluster_indices: np.ndarray, centroid, limit: int = 3) -> list[dict]:
    dists = pairwise_distances(matrix[cluster_indices], centroid.reshape(1, -1), metric="cosine").ravel()
    order = np.argsort(dists)[:limit]
    role_names = {r["id"]: r["name"] for r in ROLES}
    quotes = []
    for pos in order:
        row = df_cluster.iloc[int(pos)]
        years = row["years_num"]
        years_text = "?" if pd.isna(years) else str(int(round(float(years))))
        quotes.append({
            "t": str(row["raw_text"]).strip(),
            "m": f"{role_names.get(row['role'], row['role'])} · {years_text} yrs",
        })
    return quotes


def title_term(term: str) -> str:
    words = [w for w in re.split(r"\s+", term.replace("_", " ").strip()) if w]
    small = {"and", "or", "of", "to", "the", "a", "an"}
    titled = [w if w in {"AI", "LLM", "OS", "CS"} else (w if i and w in small else w.capitalize()) for i, w in enumerate(words)]
    return " ".join(titled)


def uniquify_sub_labels(subs: list[dict]) -> None:
    grouped: dict[tuple[str, str], list[dict]] = {}
    for sub in subs:
        grouped.setdefault((sub["cat"], sub["name"]), []).append(sub)
    generic = set(EXTRA_STOPWORDS) | {
        "understanding", "knowledge", "able", "good", "human", "humans", "things",
        "think", "thinking", "problem", "problems", "skill", "skills", "don",
        "know", "believe", "understand", "deep", "level",
    }
    for (_cat, name), items in grouped.items():
        if len(items) == 1:
            continue
        used = set()
        label_words = set(re.findall(r"[a-z]+", name.lower()))
        for item in sorted(items, key=lambda s: -s["count"]):
            chosen = None
            for term in item.get("terms", []):
                words = set(re.findall(r"[a-z]+", term.lower()))
                if not words or words <= label_words or words & generic == words:
                    continue
                candidate = title_term(term)
                if candidate and candidate not in used:
                    chosen = candidate
                    used.add(candidate)
                    break
            if chosen:
                item["name"] = f"{name}: {chosen}"
            else:
                item["name"] = f"{name}: Cluster {len(used)+1}"


def build_clusters(df: pd.DataFrame, args: argparse.Namespace) -> dict:
    stop_words = sorted(set(ENGLISH_STOP_WORDS) | EXTRA_STOPWORDS)
    df = df.copy()
    df["seed_cat"] = df["text"].map(classify_seed_category)
    df["sub"] = ""

    subs = []
    used_ids = Counter()
    seed_counts = df["seed_cat"].value_counts().to_dict()
    cluster_alloc = allocate_cluster_counts(seed_counts, args.clusters)

    for cat_info in CATS:
        cat = cat_info["id"]
        group = df[df["seed_cat"] == cat].copy()
        if group.empty:
            continue
        n_clusters = min(cluster_alloc.get(cat, 1), len(group))
        vectorizer = TfidfVectorizer(
            min_df=1 if len(group) < 50 else 3,
            max_df=0.72,
            ngram_range=(1, 2),
            stop_words=stop_words,
            sublinear_tf=True,
        )
        matrix = vectorizer.fit_transform(group["text"])
        if n_clusters == 1:
            labels = np.zeros(len(group), dtype=int)
        else:
            model = KMeans(n_clusters=n_clusters, random_state=args.random_state, n_init=20)
            labels = model.fit_predict(matrix)
        group["_cluster"] = labels

        for cluster_id in sorted(set(labels)):
            local_indices = np.flatnonzero(labels == cluster_id)
            source_indices = group.index[local_indices]
            df_cluster = group.iloc[local_indices].reset_index(drop=True)
            terms = top_terms_for_cluster(vectorizer, matrix, local_indices)
            texts = df_cluster["text"].tolist()
            base_id, label = pick_label(cluster_id, terms, texts, cat=cat)
            used_ids[f"{cat}_{base_id}"] += 1
            suffix = used_ids[f"{cat}_{base_id}"]
            node_id = f"{cat}_{base_id}" if suffix == 1 else f"{cat}_{base_id}_{suffix}"
            df.loc[source_indices, "sub"] = node_id
            centroid = np.asarray(matrix[local_indices].mean(axis=0)).ravel()
            subs.append({
                "id": node_id,
                "cat": cat,
                "name": label,
                "count": int(len(local_indices)),
                "emph": role_emphasis(df_cluster["role"]),
                "expW": exp_weights(df_cluster["years_num"]),
                "terms": terms[:6],
                "quotes": representative_quotes(df_cluster, matrix, local_indices, centroid),
            })

    uniquify_sub_labels(subs)
    subs.sort(key=lambda s: (-s["count"], s["cat"], s["name"]))
    role_names = {r["id"]: r["name"] for r in ROLES}
    responses = []
    for idx, row in df.iterrows():
        years = row["years_num"]
        responses.append({
            "id": f"r{idx}",
            "sub": row["sub"],
            "cat": row["seed_cat"],
            "role": row["role"],
            "roleName": role_names.get(row["role"], row["role"]),
            "years": None if pd.isna(years) else float(years),
            "text": str(row["raw_text"]).strip(),
        })
    return {
        "meta": {
            "source": df.attrs.get("source", "unknown"),
            "rows": int(len(df)),
            "clusters": int(len(subs)),
            "method": "Seeded categories + TF-IDF/KMeans",
        },
        "roles": ROLES,
        "buckets": BUCKETS,
        "cats": CATS,
        "subs": subs,
        "responses": responses,
    }


def write_js(data: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    output.write_text(f"window.AIOPEN_CLUSTER_DATA = {payload};\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    df = load_rows(args)
    if len(df) < 2:
        raise ValueError("Need at least 2 meaningful AIOpen responses to cluster.")
    data = build_clusters(df, args)
    write_js(data, args.output)
    print(f"Wrote {args.output}")
    print(f"Rows: {data['meta']['rows']}, clusters: {data['meta']['clusters']}, source: {data['meta']['source']}")


if __name__ == "__main__":
    main()
