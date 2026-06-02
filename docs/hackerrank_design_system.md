# HackerRank-Inspired Design System

Reference target: HackerRank 2025 Developer Skills Report

Project theme: Developer careers in the AI era

Implementation language: English only. All visible titles, navigation labels, section headings, card copy, buttons, chips, chart labels, alt text, and ARIA labels should be written in English.

## Design Intent

The page should feel like HackerRank's bright editorial report, not a generic dashboard. Use a white canvas, strict black grid lines, very large section typography, pale green summary cards, and repeated insight chapters.

Core mood:

- Developer hiring and skills intelligence report
- White print-report layout with visible grid construction
- Data-backed but conversational
- Clear tension: hiring is back, AI is accelerating work, but career paths are unstable

## Visual Tokens

Use the CSS variables in `assets/hackerrank-theme.css`.

Primary colors:

- `--hr-bg`: white report background
- `--hr-line`: black grid and section rules
- `--hr-green`: HackerRank green accent
- `--hr-green-dark`: dark teal summary background
- `--hr-mint`: pale green card fill
- `--hr-blue`, `--hr-peach`, `--hr-lavender`, `--hr-yellow`: soft illustration/chart accents

The dominant palette should be white, black, mint, dark teal, and HackerRank green.

## Typography

Recommended imports:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">
```

Typography rules:

- Use Inter for body, headings, UI, and captions.
- Use IBM Plex Mono only for tiny metadata labels.
- Use oversized sans-serif headings with generous whitespace.
- Keep letter spacing at `0` for normal text. Use mild uppercase tracking only for tiny labels.

## Page Structure

Recommended order:

1. Cover: HackerRank-like logo row, large visual, huge English title
2. Introduction: black-line grid and two-column body text
3. Executive Summary: dark teal page with pale green cards
4. Insight 1: Junior hiring and entry barrier
5. Insight 2: AI tool adoption and productivity pressure
6. Insight 4: AIOpen text clustering results from open-ended responses
7. Insight 5: Interactive redraft board with persona toggle + ranking
8. Final playbook: job seeker, junior, senior

HackerRank-like section pattern:

```html
<section class="hr-grid-section">
  <div class="hr-section">
  <aside class="hr-section__intro">
    <p class="hr-kicker">Insight #1</p>
    <h2>AI makes developers faster, but not equally fast.</h2>
    <p>Short explanatory paragraph.</p>
  </aside>
  <div class="hr-panel">
    Chart or interactive visualization
  </div>
  </div>
</section>
```

## Components To Reuse

- `.hr-topbar`: sticky navigation
- `.hr-hero`: cover page with logo row, visual block, and huge title
- `.hr-summary`, `.hr-stat-grid`, `.hr-stat`: executive summary page
- `.hr-grid-section` and `.hr-section`: black-grid two-column sections
- `.hr-panel`: chart container
- `.hr-callout`: emphasized insight block
- `.hr-segmented`: persona toggle
- `.hr-chip`: role/skill labels
- `.hr-progress`: compact bar values
- `.hr-playbook`: final recommendations

## Data Visualization Style

Charts should use:

- White panels with black borders
- Pale green insight cards
- Thick black rules for structure
- HackerRank green for primary highlights
- Soft blue, peach, lavender, and yellow for secondary chart series

Best chart pairings for this story:

- Redraft board: connected rank movement
- AI usage: stacked horizontal bars
- Trust/risk: diverging bars
- Text clustering: grouped bubbles or network clusters using AIOpen response categories
- Career paths: role scatter or quadrant
- Final recommendations: three playbook columns

## Copy Tone

Use English report-style lines:

- "Hiring is back, but the entry point is still narrow."
- "AI makes developers faster, but not equally fast."
- "The next career edge is not one tool. It is a stack of speed, verification, and judgment."

Avoid generic instruction text inside the app. Let labels and controls explain themselves.

## Implementation Notes

- Start from `q3_hackerrank_starter.html` for the visual shell.
- Final `index.html` should merge the current story flow with the HackerRank-inspired shell.
- Reuse the current developer map, AI task map, human-skill network, AIOpen text clustering data, and skill redraft board.
- Use `sohyoeun/data/aiopen_clusters.js` for the open-ended response clustering section.
- Keep `assets/hackerrank-theme.css` as the single theme source.
- If a page already has embedded CSS, import this CSS first, then replace local colors with `--hr-*` variables.
