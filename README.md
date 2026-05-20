# World Flags Quiz

A premium interactive static website for practicing world country flags. Each round shows 15 unique flags, and each question asks the player to choose the correct country from four difficult answer options.

## How It Works

- The local dataset contains 196 independent sovereign/observer country entries and excludes dependent territories and subdivisions.
- Each quiz session randomly selects 15 unique countries.
- Every question shows one local SVG flag and four randomized country choices.
- Answer choices are generated with region, subregion, and known lookalike/confusion groups so distractors are intentionally difficult.
- Once an answer is selected, it locks immediately, shows feedback, highlights the correct answer, and marks the chosen wrong answer when applicable.
- The final screen shows score, percentage, a short performance message, and a review list.

## Run Locally

Because the site fetches `countries.json`, use a local static server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy or Update GitHub Pages

This project is built for GitHub Pages and uses only relative paths.

```bash
git add .
git commit -m "Update flag quiz"
git push
```

If Pages is enabled from the `main` branch root, updates publish automatically after the push.

## Public URL Format

```text
https://<github-username>.github.io/world-flags-quiz/
```

For this repository:

```text
https://Ahmad9077.github.io/world-flags-quiz/
```

## Main Features

- Static vanilla HTML, CSS, and JavaScript
- Local `countries.json` data file
- Local SVG flag assets
- Smart distractor generation
- 15-question sessions with no repeated countries
- Locked answers with instant visual feedback
- Animated progress indicator
- Score tracker and review screen
- Responsive premium dark theme
- Keyboard shortcuts: `1` to `4` choose answers, `Enter` or `Space` advances after locking
- GitHub Pages compatible
