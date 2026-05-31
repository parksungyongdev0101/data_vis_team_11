# Q2 — Visualizing How AI Is Reshaping Developers' Careers (Team 11)

데이터 시각화 팀프로젝트 중 **Q2** 파트. Stack Overflow Developer Survey 2023·2024·2025 기반.
*How is AI transforming developers' work, compensation, and careers — who is gaining an edge, and who is falling behind?*

## 뷰 (visualizations)

| 파일 | 내용 | 데이터 |
|:--|:--|:--|
| [viz/q2.html](viz/q2.html) | 스크롤리텔링 9 scene — 채택 급증 → 지리 착시(Simpson's Paradox) → 노출 역설 → 스킬 위축 등 | `viz/data/q2_*.json` |
| [viz/salary.html](viz/salary.html) | 인터랙티브 연봉 추정기 (프로필 입력 → 매칭 코호트 중위 연봉) | `viz/data/salary_pool.json` |

두 페이지는 상단 nav로 서로 연결됨 — 같은 폴더에 함께 두면 됨.

## 실행 방법

`viz/*.html`은 데이터를 `fetch`하므로 **로컬 서버**가 필요(`file://`로 직접 열면 안 됨):

```bash
cd viz && python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/q2.html
```

## 구조

```
viz/q2.html       Q2 스크롤리텔링
viz/salary.html   연봉 추정기
viz/data/         전처리된 JSON (q2_*.json, salary_pool.json)
scripts/          원본 CSV → viz/data/*.json 재생성
  gen_q2_viz.py        → q2_*.json (q2.html scene 1~9)
  gen_salary_data.py   → salary_pool.json (salary.html)
  build_standalone.py  → 데이터 내장 단독본(옵션)
Q2.md             분석 결과 + 차트별 설명 + 데이터 파이프라인 (통합 문서)
data/             원본 설문 CSV (447MB, gitignore — 공유 레포엔 없음)
```

## 데이터 / 분석

- Q2 전체 설명: [Q2.md](Q2.md) — findings 8개, scene별 차트 인코딩, 파이프라인.
- 핵심 발견 **The Geography Illusion**(Simpson's Paradox): 글로벌로는 AI 사용자가 덜 버는 듯 보이나(−7.8%), 국가를 통제하면 더 범(+14.8%, 18/21개국).

## 데이터 재현

`viz/data/*.json`은 전처리 결과물이라 그대로 동작함. 처음부터 다시 만들려면 원본 CSV가 필요:
[Stack Overflow Annual Developer Survey](https://survey.stackoverflow.co/)에서 2023·2024·2025를 내려받아 `data/stackoverflow/{year}/results.csv`로 두고 `scripts/gen_q2_viz.py`, `scripts/gen_salary_data.py` 실행. (원본은 447MB라 레포에서 제외됨. 컬럼 설명은 [data/DATA_PROFILE.md](data/DATA_PROFILE.md).)
