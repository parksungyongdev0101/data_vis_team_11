# Q3 Story Plan

Project Q3: In this AI-driven shift, what skills, roles, and career paths should developers prepare for?

## Narrative Hook

Do not begin with "learn Python" or "use AI." Begin with a draft-board question:

> If developers had to draft their next skill today, would they pick the most popular language, the fastest-growing one, or the one closest to AI work?

This mirrors The Pudding's NBA redraft structure: explain a simple re-ranking rule with one familiar example, then apply it across the full field.

## Core Visual Metaphor

"Developer Skill Redraft"

Current popularity is the original draft order. Preparedness score is the redraft order.

Preparedness score:

```text
score = popularity_weight * StackOverflow_2025_usage
      + momentum_weight * GitHub_2020Q1_to_2025Q4_growth
      + AI_weight * AI_adjacency_score
```

Default weights by persona:

| Persona | Popularity | Momentum | AI adjacency | Why |
|---|---:|---:|---:|---|
| Job Seeker | 35 | 40 | 25 | Needs employable skills with growth upside |
| Junior Developer | 25 | 35 | 40 | Needs leverage from AI-native workflows |
| Senior Developer | 25 | 25 | 50 | Needs strategic relevance and review/architecture judgment |

## Scroll Structure

1. The old board
   Show Stack Overflow 2025 language popularity. JavaScript, Python, SQL, Bash/Shell, and TypeScript dominate by usage.

2. The market moves
   Animate the board by GitHub Innovation Graph growth from 2020 Q1 to 2025 Q4. TypeScript, Rust, Kotlin, Python, and JavaScript rise sharply.

3. The AI filter
   Add an AI-adjacency layer. Python remains central, but TypeScript/JavaScript matter because AI tools are entering product and web workflows; Rust/Go matter for infra and performance-sensitive systems.

4. The redraft
   Re-rank skills with persona-specific weights. The user can toggle Job Seeker, Junior, or Senior and adjust the weights.

5. Career path
   Move from skills to roles. Plot median salary vs. years of professional experience from Stack Overflow 2025 role data. Highlight roles that combine AI leverage and career durability: AI/ML engineer, data engineer, cloud infrastructure engineer, architect, DevOps, cybersecurity, and engineering manager.

6. So what?
   End with persona-specific recommendations:
   - Job Seeker: Python + TypeScript + SQL/data + portfolio with AI-assisted workflow evidence.
   - Junior Developer: learn AI tools, but build verification/debugging habits because distrust and "almost right" AI output are major pain points.
   - Senior Developer: lean into architecture, review, security, data quality, and mentoring; AI raises the value of judgment.

## Required Interaction

- Persona toggle changes the redraft ranking.
- Weight sliders let users define what "prepare" means.
- The board starts in today's popularity order; the AI Era Redraft button triggers the reordering moment.
- Hover on each skill explains why it moved.
- Click a skill to lock the explanation panel.
- Linked role scatter updates the suggested path text for the selected persona.

## Perception-Driven Design Rules

- Use position on a common scale for the detailed score anatomy. This follows Cleveland and McGill's graphical perception hierarchy: people compare values more accurately on shared aligned scales than with area, angle, or shading.
- Use connectedness and common fate for the redraft board. A skill's original rank and AI-era rank are connected by a line, so the viewer perceives one moving object rather than two disconnected labels.
- Use figure-ground contrast sparingly. Only the selected skill, top mover, and active persona path get strong contrast; everything else recedes.
- Use overview first, detail on demand. The board gives the whole reorder pattern, then the anatomy panel explains the selected skill.
- Use proximity and common region. Controls live with the story text; redraft evidence lives in one enclosed board; career recommendations live below the role map.

## Data Notes

- Stack Overflow Developer Survey 2025 is self-reported and over-represents survey respondents, not all developers.
- GitHub Innovation Graph covers public GitHub activity, aggregated by economy and quarter.
- AI adjacency is a transparent heuristic for story prototyping. If time allows, replace it with raw Stack Overflow "worked with / want to work with" AI-tag or tool co-occurrence from survey microdata.
