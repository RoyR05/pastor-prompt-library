# Pastor Prompt Library

A free, unbranded library of 77 practical AI prompts for the weekly work of ministry.

The site helps pastors and ministry teams browse prompts by ministry area, add local church context, adapt the prompt for a preferred AI assistant, and copy a ready-to-use version.

## What is included

- 77 reviewed prompts across 10 ministry areas
- Guidance for when to use each prompt
- Editorial notes explaining how each prompt was strengthened
- Optional adaptations for ChatGPT, Claude, and Gemini
- A reusable church profile stored only in the visitor's browser
- Clear reminders to remove sensitive pastoral and personal information
- Responsive layouts for desktop, tablet, and mobile

## Public website

[royr05.github.io/pastor-prompt-library](https://royr05.github.io/pastor-prompt-library/)

The site is published with GitHub Pages and is available without a ChatGPT account.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Content

The prompt library is maintained in `lib/prompts.json`. The main experience is implemented in `app/page.tsx`, with the visual system in `app/globals.css`.

## Privacy

The site does not send church profiles or source material to a server. The church profile is stored locally in the browser. Visitors should still remove private counseling, health, donor, child, and personnel information before copying material into any AI assistant.

## Release status

The website is publicly available. Licensing terms for reuse have not yet been finalized.
