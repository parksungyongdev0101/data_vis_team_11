"""Bundle interactive HTML pages into fully self-contained single files.

Inlines (1) the d3 library and (2) every `data/*.json` the page fetches, so each
output HTML opens with zero dependencies — no web server, no internet, just
double-click the file. Outputs to viz/standalone/.

Run: python3 scripts/build_standalone.py
"""
import re, json, os, shutil

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIZ = os.path.join(BASE, "viz")
OUT = os.path.join(VIZ, "standalone")
D3 = os.path.join(BASE, "scripts", ".cache", "d3.v7.min.js")

# pages that fetch external JSON and need inlining
TARGETS = ["q2.html", "salary.html"]
# already self-contained (no fetches) — copied as-is so cross-page nav works
COPY_AS_IS = ["index.html"]

D3_TAG = '<script src="https://d3js.org/d3.v7.min.js"></script>'


def build(name, d3_src):
    src = open(os.path.join(VIZ, name), encoding="utf-8").read()
    urls = sorted(set(re.findall(r'd3\.json\("([^"]+)"\)', src)))

    blob = {}
    for u in urls:
        path = os.path.join(VIZ, u)
        with open(path, encoding="utf-8") as f:
            blob[u] = json.load(f)

    # shim: serve inlined data from d3.json, fall back to network for anything else
    data_js = json.dumps(blob, ensure_ascii=False, separators=(",", ":"))
    shim = (
        "<script>\n" + d3_src + "\n</script>\n"
        "<script>\n"
        "window.__INLINE_DATA__=" + data_js + ";\n"
        "(function(){var orig=d3.json;d3.json=function(u){"
        "return (u in window.__INLINE_DATA__)?Promise.resolve(window.__INLINE_DATA__[u]):orig.apply(d3,arguments);};})();\n"
        "</script>"
    )
    if D3_TAG not in src:
        raise SystemExit(f"{name}: expected d3 CDN tag not found")
    out = src.replace(D3_TAG, shim)

    dst = os.path.join(OUT, name)
    with open(dst, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"  {name}: inlined {len(urls)} data file(s) + d3 -> standalone/{name} "
          f"({os.path.getsize(dst)/1024:.0f} KB)")


def main():
    os.makedirs(OUT, exist_ok=True)
    d3_src = open(D3, encoding="utf-8").read()
    print("Building self-contained pages...")
    for name in TARGETS:
        build(name, d3_src)
    for name in COPY_AS_IS:
        # inline d3 here too so it also works fully offline
        src = open(os.path.join(VIZ, name), encoding="utf-8").read()
        if D3_TAG in src:
            src = src.replace(D3_TAG, "<script>\n" + d3_src + "\n</script>")
        dst = os.path.join(OUT, name)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(src)
        print(f"  {name}: copied (d3 inlined) -> standalone/{name} "
              f"({os.path.getsize(dst)/1024:.0f} KB)")
    print(f"\nDone. Share any file in: {OUT}")
    print("Each opens by double-click (file://) — no server, no internet needed.")


if __name__ == "__main__":
    main()
