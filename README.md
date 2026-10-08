# CareerX

CareerX turns a career goal and current skills into an interactive learning plan. It includes a dependency graph, milestone detail panels, skill ratings, progress and streak tracking, a weekly planner, job-post matching, resume text skill detection, and local progress saving.

## Run in VS Code on Windows

Open this folder in VS Code. In its PowerShell terminal, run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the `Local` URL printed by Vite (usually `http://localhost:5173/`). Leave the terminal running while you use the site. `npm.cmd` avoids PowerShell's script policy blocking `npm.ps1`.

The first `npm.cmd install` may show skipped `esbuild` setup scripts. This project pins approvals for its Vite build dependency versions in `package.json`. If setup was already skipped, run `npm.cmd install` again after approval.

## AI mode and demo fallback

The React app is a Vite frontend. Its AI routes live in `api/` and run as Vercel serverless functions. Local `npm.cmd run dev` does not serve those functions, so generation clearly falls back to a role-specific demo plan. To use AI while developing locally, run the Vercel CLI with the project's environment variables.

Set these server-side Vercel environment variables to an OpenAI-compatible chat-completions provider:

```text
AI_API_KEY=your provider key
AI_API_URL=https://provider.example/v1/chat/completions
AI_MODEL=provider model name
```

Never expose the API key through a `VITE_` variable or commit a real key.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Import that repository in Vercel.
3. Choose Vite, build command `npm run build`, and output directory `dist`.
4. Add `AI_API_KEY`, `AI_API_URL`, and `AI_MODEL` in Vercel Project Settings → Environment Variables.
5. Deploy. The static React app and `/api` functions use the same origin.

## Features

- Draggable, zoomable milestone graph with dependency edges and saved node positions.
- Phase list with reveal animations, skip/restore controls, and dependency warnings.
- Skill chips, resume/LinkedIn text skill detection, and per-skill beginner/comfortable/strong ratings.
- Skill-gap view based on exact normalized skill phrases; ratings update milestone status and progress.
- Progress ring, day streak, completion celebration, and browser-local saved progress.
- Weekly time slider and planner that recalculate the estimated finish date.
- Job-post keyword comparison, milestone chat/quiz feedback when AI is configured, print/PDF, and read-only share links.
- Dark theme, keyboard-accessible milestone drawer, and mobile bottom navigation.
- AI streaming milestone previews, clear failure state, retry, and tailored designer/data analyst/web developer demo plans.

## Privacy and limits

Progress, skill ratings, theme, and the job post are saved in this browser's local storage. Resume/LinkedIn text is scanned locally and is not sent to the AI route. A share link contains the roadmap and completed milestones only; it does not include the background, entered skills, or ratings. Chat messages and roadmap form fields are sent to the configured AI provider when its API is enabled. There is no account or cloud database.
