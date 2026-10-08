import { useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import type { FormEvent, KeyboardEvent } from "react";
import RoadmapGraph from "./components/RoadmapGraph";
import type { Milestone, NodeStatus, Roadmap, UserInput } from "./types/roadmap";

type Rating = "beginner" | "comfortable" | "strong";
type SavedState = { input?: UserInput; roadmap?: Roadmap | null; completed?: string[]; skipped?: string[]; ratings?: Record<string, Rating>; dark?: boolean; jobPosting?: string; activityDays?: string[]; isShared?: boolean };
type View = "tree" | "list" | "skills" | "planner" | "match";
const STORAGE_KEY = "careerx.workspace.v2";
const starter: UserInput = { job: "Machine Learning Engineer", background: "Final-year computer science student", skills: "Python, Statistics, SQL", hours: 8, timeline: "6 months" };
const demo: Roadmap = {
  source: "demo", phases: [{ name: "Build foundations" }, { name: "Learn machine learning" }, { name: "Ship real projects" }, { name: "Get career-ready" }], roles: ["Junior ML Engineer", "AI Engineer Intern", "Data Analyst"],
  nodes: [
    { id: "python", title: "Python for data", phase: 0, hours: 12, deps: [], keys: ["python"], skills: ["Python", "Pandas"], why: "Most ML workflows use Python to clean data, train models, and put experiments into code.", action: "Build a notebook that explores a small public dataset. Practice data frames, functions, and plotting.", project: "Dataset explorer", github: "https://github.com/topics/python-data-analysis", questions: ["Can I clean missing values?", "Can I explain my charts?"], resources: ["https://pandas.pydata.org/docs/getting_started/index.html"] },
    { id: "math", title: "Statistics essentials", phase: 0, hours: 16, deps: [], keys: ["statistics", "probability"], skills: ["Statistics", "Probability"], why: "A practical grasp of uncertainty and distributions helps you understand what model results actually mean.", action: "Review probability, sampling, and distributions; explain one concept with a chart each day.", project: "A visual guide to probability", github: "https://github.com/topics/statistics", questions: ["What does a confidence interval tell me?", "When can correlation mislead?"], resources: ["https://seeing-theory.brown.edu/"] },
    { id: "sql", title: "SQL for real data", phase: 0, hours: 10, deps: [], keys: ["sql", "database"], skills: ["SQL", "Data querying"], why: "ML work begins with finding and shaping useful data. SQL is the common way teams do that.", action: "Write queries using joins, grouping, and window functions on a sample database.", project: "Product analytics queries", github: "https://github.com/topics/sql", questions: ["Can I join three tables?", "Can I validate a query result?"], resources: ["https://sqlbolt.com/"] },
    { id: "ml", title: "ML foundations", phase: 1, hours: 22, deps: ["python", "math"], keys: ["machine learning", "scikit", "sklearn"], skills: ["Scikit-learn", "Model evaluation"], why: "These fundamentals help you choose a useful model and spot when it is overfitting.", action: "Train baseline classification and regression models. Compare train, validation, and test performance.", project: "Explainable prediction model", github: "https://github.com/topics/scikit-learn", questions: ["What is data leakage?", "Which metric fits this problem?"], resources: ["https://scikit-learn.org/stable/getting_started.html"] },
    { id: "data", title: "Data preparation", phase: 1, hours: 18, deps: ["python", "sql"], keys: ["data cleaning", "feature engineering"], skills: ["Feature engineering", "Data validation"], why: "Reliable input data often matters more than a fancy algorithm. Clear data checks make results repeatable.", action: "Create a reusable pipeline for cleaning, encoding, and validating a dataset.", project: "Reusable preprocessing pipeline", github: "https://github.com/topics/data-cleaning", questions: ["How will my pipeline handle new categories?", "How will I catch drift?"], resources: ["https://scikit-learn.org/stable/modules/compose.html"] },
    { id: "deep", title: "Neural networks", phase: 2, hours: 24, deps: ["ml"], keys: ["deep learning", "pytorch", "tensorflow"], skills: ["PyTorch", "Neural networks"], why: "Deep learning powers many language, image, and speech systems. Start with the problem before choosing it.", action: "Train a small neural network and compare it with your simpler baseline.", project: "Image classifier with an error analysis", github: "https://github.com/topics/pytorch", questions: ["Where does the model fail?", "Does more complexity improve results?"], resources: ["https://pytorch.org/tutorials/beginner/basics/intro.html"] },
    { id: "deploy", title: "Deploy an ML service", phase: 2, hours: 20, deps: ["ml", "data"], keys: ["deployment", "fastapi", "docker"], skills: ["FastAPI", "Docker", "API design"], why: "A model becomes useful when another person or product can use it safely and reliably.", action: "Wrap a trained model in a small API. Add input validation, clear errors, and a README.", project: "Deployable prediction API", github: "https://github.com/topics/fastapi-machine-learning", questions: ["Are invalid inputs rejected?", "Can someone else run this?"], resources: ["https://fastapi.tiangolo.com/tutorial/"] },
    { id: "portfolio", title: "Portfolio and interviews", phase: 3, hours: 14, deps: ["deep", "deploy"], keys: ["portfolio", "interview"], skills: ["Technical communication", "Interview practice"], why: "Hiring teams need to see your decisions, trade-offs, and learning—not just a list of tools.", action: "Polish two projects, write concise case studies, and practice explaining one design choice each day.", project: "Career-ready project portfolio", github: "https://github.com/topics/machine-learning-portfolio", questions: ["Can I explain a failed experiment?", "Is setup reproducible?"], resources: ["https://github.com/readme"] },
  ]
};
const suggestions = ["Python", "JavaScript", "TypeScript", "SQL", "Statistics", "Excel", "Figma", "React", "CSS", "HTML", "Git", "Communication", "Data analysis", "Project management", "Machine learning"];
const normalize = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9+#. ]/g, "").replace(/\s+/g, " ");
function hasPhrase(text: string, phrase: string) {
  const words = normalize(text).split(" ").filter(Boolean); const target = normalize(phrase).split(" ").filter(Boolean);
  return target.length > 0 && words.some((_, index) => target.every((word, offset) => words[index + offset] === word));
}
function readSaved(): SavedState {
  try {
    const shared = new URLSearchParams(window.location.search).get("share");
    if (shared) {
      const raw = JSON.parse(decodeURIComponent(escape(atob(shared.replace(/-/g, "+").replace(/_/g, "/"))))) as { roadmap?: Roadmap; completed?: string[]; job?: string };
      if (raw.roadmap && Array.isArray(raw.roadmap.nodes) && Array.isArray(raw.roadmap.phases)) return { roadmap: raw.roadmap, completed: raw.completed ?? [], input: { ...starter, job: raw.job ?? starter.job }, isShared: true };
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch { return {}; }
}
function demoFor(job: string): Roadmap {
  const target = normalize(job);
  if (/design|ux|ui|product/.test(target)) return { ...demo, roles: ["Junior Product Designer", "UX Designer", "Design Intern"], phases: [{ name: "Design foundations" }, { name: "Research and systems" }, { name: "Ship a case study" }, { name: "Portfolio and interviews" }], nodes: demo.nodes.map((node, i) => ({ ...node, id: `design-${node.id}`, title: ["Visual design basics", "User research", "Wireframes and prototypes", "Design systems", "Usability testing", "Product collaboration", "Portfolio case study", "Design interviews"][i], skills: [["Typography", "Layout"], ["Interviewing", "Research"], ["Wireframing", "Prototyping"], ["Components", "Figma"], ["Usability", "Accessibility"], ["Product thinking", "Communication"], ["Case studies", "Storytelling"], ["Portfolio", "Interview practice"]][i], keys: [["typography", "layout"], ["research", "interviews"], ["wireframe", "prototype"], ["figma", "design system"], ["usability", "accessibility"], ["product thinking"], ["portfolio"], ["interview"]][i], why: "This skill helps you make clear, user-focused product decisions and explain the reasoning behind your work.", action: "Practice one small design exercise, ask someone for feedback, and record what you changed.", project: ["Redesign a small interface", "Five user interviews", "Clickable onboarding prototype", "Reusable component library", "Usability test report", "Product critique", "End-to-end design case study", "Portfolio walkthrough"][i], deps: node.deps.map((dep) => `design-${dep}`) })) };
  if (/web|frontend|software|developer|engineer/.test(target) && !/machine|data/.test(target)) return { ...demo, roles: ["Junior Frontend Developer", "Web Developer", "Software Intern"], phases: [{ name: "Web foundations" }, { name: "Build with React" }, { name: "Ship a full project" }, { name: "Get job-ready" }], nodes: demo.nodes.map((node, i) => ({ ...node, id: `web-${node.id}`, title: ["HTML, CSS and JavaScript", "Git and browser tools", "React fundamentals", "APIs and state", "Testing and accessibility", "Build a full-stack feature", "Deploy a portfolio project", "Interview practice"][i], skills: [["HTML", "CSS", "JavaScript"], ["Git", "Browser DevTools"], ["React", "Components"], ["APIs", "State management"], ["Testing", "Accessibility"], ["Backend", "Databases"], ["Deployment", "Portfolio"], ["Communication", "Interview practice"]][i], keys: [["html", "css", "javascript"], ["git", "devtools"], ["react", "components"], ["api", "state"], ["testing", "accessibility"], ["backend", "database"], ["deployment", "portfolio"], ["interview"]][i], why: "This is a practical building block for creating, testing, and shipping reliable web products.", action: "Build a small feature, write down what you learned, and commit the result to GitHub.", project: ["Responsive landing page", "Version-controlled code samples", "Interactive React app", "Data-backed search", "Accessible component set", "Full-stack application", "Deployed personal portfolio", "Technical project walkthrough"][i], deps: node.deps.map((dep) => `web-${dep}`) })) };
  if (/analyst|analytics|data/.test(target) && !/machine|learning/.test(target)) return { ...demo, roles: ["Data Analyst", "BI Analyst Intern", "Product Analyst"], phases: [{ name: "Data foundations" }, { name: "Analyze and visualize" }, { name: "Build a portfolio" }, { name: "Prepare for interviews" }], nodes: demo.nodes.map((node, i) => ({ ...node, id: `analyst-${node.id}`, title: ["Spreadsheets and data quality", "SQL for analytics", "Statistics for decisions", "Python data analysis", "Dashboards and storytelling", "Experiment analysis", "Portfolio case study", "Analyst interviews"][i], skills: [["Excel", "Data cleaning"], ["SQL", "Joins"], ["Statistics", "Probability"], ["Python", "Pandas"], ["Visualization", "Storytelling"], ["A/B testing", "Metrics"], ["Portfolio", "Communication"], ["Interview practice", "Business thinking"]][i], keys: [["excel", "cleaning"], ["sql", "joins"], ["statistics", "probability"], ["python", "pandas"], ["dashboard", "visualization"], ["testing", "metrics"], ["portfolio"], ["interview"]][i], why: "Analysts use this skill to turn trustworthy data into a clear recommendation for a team.", action: "Use a small public dataset to answer a focused business question and explain your method.", project: ["Clean-data checklist", "Business SQL query collection", "Metric interpretation notes", "Exploratory data notebook", "One-page dashboard", "Experiment readout", "End-to-end analysis", "Case-study presentation"][i], deps: node.deps.map((dep) => `analyst-${dep}`) })) };
  return demo;
}
function knownNodes(roadmap: Roadmap, skills: string, ratings: Record<string, Rating>) {
  const entered = skills.split(",").map(normalize).filter(Boolean);
  const enteredAndRated = entered.filter((skill) => {
    const explicit = Object.entries(ratings).find(([name]) => normalize(name) === skill)?.[1];
    return !explicit || explicit === "comfortable" || explicit === "strong";
  });
  const ratedMastered = Object.entries(ratings).filter(([, rating]) => rating === "comfortable" || rating === "strong").map(([skill]) => normalize(skill));
  const known = [...enteredAndRated, ...ratedMastered];
  return roadmap.nodes.filter((node) => [...node.keys, ...node.skills].some((candidate) => {
    const item = normalize(candidate);
    return known.some((skill) => hasPhrase(item, skill));
  })).map((node) => node.id);
}
function dueWeeks(hours: number, perWeek: number) { return Math.max(1, Math.ceil(hours / Math.max(1, perWeek))); }
function estimateDate(weeks: number) { const date = new Date(); date.setDate(date.getDate() + weeks * 7); return date.toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
function weekStartLabel(offset: number) { const date = new Date(); date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7); return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function localDay(date = new Date()) { return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }

export default function App() {
  const saved = useMemo(readSaved, []);
  const [input, setInput] = useState<UserInput>(saved.input ?? starter);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(saved.roadmap ?? null);
  const [busy, setBusy] = useState(false);
  const [streamMilestones, setStreamMilestones] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [completed, setCompleted] = useState<string[]>(saved.completed ?? []);
  const [skipped, setSkipped] = useState<string[]>(saved.skipped ?? []);
  const [activityDays, setActivityDays] = useState<string[]>(saved.activityDays ?? []);
  const [jobPosting, setJobPosting] = useState(saved.jobPosting ?? "");
  const [resumeText, setResumeText] = useState("");
  const [isShared] = useState(saved.isShared ?? false);
  const [ratings, setRatings] = useState<Record<string, Rating>>(saved.ratings ?? {});
  const [tab, setTab] = useState<View>("tree");
  const [dark, setDark] = useState(saved.dark ?? false);
  const [skillDraft, setSkillDraft] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizFeedback, setQuizFeedback] = useState("");
  const drawerRef = useRef<HTMLElement>(null);
  const known = useMemo(() => roadmap ? knownNodes(roadmap, input.skills, ratings) : [], [roadmap, input.skills, ratings]);
  const statusFor = useMemo(() => (node: Milestone): NodeStatus => {
    if (known.includes(node.id) || completed.includes(node.id)) return "known";
    if (skipped.includes(node.id)) return "skipped";
    return node.deps.every((dep) => known.includes(dep) || completed.includes(dep)) ? "ready" : "locked";
  }, [known, completed, skipped]);
  const setField = (key: keyof UserInput, value: string | number) => setInput((prev) => ({ ...prev, [key]: value }));
  useEffect(() => { if (!isShared) localStorage.setItem(STORAGE_KEY, JSON.stringify({ input, roadmap, completed, skipped, ratings, dark, jobPosting, activityDays } satisfies SavedState)); }, [input, roadmap, completed, skipped, ratings, dark, jobPosting, activityDays, isShared]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLElement>("button, input, a")?.focus();
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "Tab" && drawerRef.current) {
        const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])'));
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [selected]);

  async function runGeneration(isReplan = false) {
    setBusy(true); setNotice(""); setError(""); setSelected(null); setStreamMilestones([]);
    try {
      const response = await fetch("/api/generate-stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok || !response.body) throw new Error(`AI service responded with ${response.status}`);
      if (!response.headers.get("content-type")?.includes("text/event-stream")) throw new Error("AI streaming is available after Vercel deployment");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let result: Roadmap | null = null;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const eventName = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
          const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6)) as { title?: string; roadmap?: Roadmap; message?: string };
          if (eventName === "milestone" && payload.title) setStreamMilestones((before) => [...before, payload.title!]);
          if (eventName === "complete" && payload.roadmap) result = payload.roadmap;
          if (eventName === "error") throw new Error(payload.message ?? "AI service is unavailable");
        }
      }
      if (!result) throw new Error("AI response was incomplete");
      if (result.source !== "ai" || !Array.isArray(result.nodes) || result.nodes.length === 0) throw new Error("AI response was incomplete");
      setRoadmap(result); setCompleted([]); setNotice(isReplan ? "Your roadmap has been replanned around your updated details." : "Your personalized roadmap is ready."); setStreamMilestones([]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "AI service is unavailable";
      setRoadmap(demoFor(input.job)); setCompleted([]); setError(`${message}. Showing a demo roadmap instead.`); setStreamMilestones([]);
    } finally { setBusy(false); }
  }
  function generate(event: FormEvent) { event.preventDefault(); void runGeneration(); }
  function addSkill(value: string) {
    const next = value.trim().replace(/[,;]$/, "");
    if (!next) return;
    const current = input.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    if (!current.some((skill) => normalize(skill) === normalize(next))) setField("skills", [...current, next].join(", "));
    setSkillDraft("");
  }
  function onSkillKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addSkill(skillDraft); }
    if (event.key === "Backspace" && !skillDraft) setField("skills", input.skills.split(",").slice(0, -1).join(", "));
  }
  function completeMilestone(node: Milestone) {
    setCompleted((before) => before.includes(node.id) ? before : [...before, node.id]);
    setSkipped((before) => before.filter((id) => id !== node.id));
    const today = localDay(); setActivityDays((before) => before.includes(today) ? before : [...before, today]);
    setSelected(null); setCelebrate(true); window.setTimeout(() => setCelebrate(false), 1500);
  }
  const finished = roadmap?.nodes.filter((node) => known.includes(node.id) || completed.includes(node.id)).length ?? 0;
  const percent = roadmap?.nodes.length ? Math.round(finished / roadmap.nodes.length * 100) : 0;
  const hoursRemaining = roadmap?.nodes.reduce((sum, node) => sum + (known.includes(node.id) || completed.includes(node.id) || skipped.includes(node.id) ? 0 : node.hours), 0) ?? 0;
  const weeks = dueWeeks(hoursRemaining, input.hours);
  const expectedSkills = [...new Set(roadmap?.nodes.flatMap((node) => node.skills) ?? [])];
  const enteredSkills = input.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
  const skillGapCount = expectedSkills.filter((skill) => (ratings[skill] ?? (enteredSkills.some((item) => normalize(item) === normalize(skill)) ? "comfortable" : "beginner")) === "beginner").length;
  const phaseComplete = roadmap?.phases.map((phase, index) => roadmap.nodes.filter((node) => node.phase === index).every((node) => known.includes(node.id) || completed.includes(node.id))) ?? [];
  const matchSkillSet = normalize(jobPosting);
  const matchPercent = expectedSkills.length ? Math.round(expectedSkills.filter((skill) => hasPhrase(matchSkillSet, skill)).length / expectedSkills.length * 100) : 0;
  let streak = 0; const activeDays = new Set(activityDays); const cursor = new Date(); if (!activeDays.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1); while (activeDays.has(localDay(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const loadingCopy = ["Mapping your skills…", "Finding projects that fit…", "Laying out your milestones…"];
  const [loadingIndex, setLoadingIndex] = useState(0);
  useEffect(() => { if (!busy) { setLoadingIndex(0); return; } const timer = window.setInterval(() => setLoadingIndex((i) => (i + 1) % loadingCopy.length), 1500); return () => window.clearInterval(timer); }, [busy]);

  async function askMilestone() {
    if (!selected || !chatText.trim()) return;
    setChatBusy(true); setChatAnswer("");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ milestone: selected, question: chatText.slice(0, 500) }) });
      if (!response.ok) throw new Error("Chat is not available in this local preview");
      const payload = await response.json() as { answer?: string };
      setChatAnswer(payload.answer ?? "Try breaking the action into one small practice session, then compare the result with a baseline.");
    } catch { setChatAnswer(`Try this: ${selected.action} Start with a small example, then write down what was confusing so you can ask a more specific follow-up.`); }
    finally { setChatBusy(false); }
  }
  function doPrint() { if (tab === "tree") setTab("list"); window.setTimeout(() => window.print(), 160); }
  async function share() {
    try {
      if (!roadmap) return;
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ roadmap, completed, job: input.job }))));
      const url = `${window.location.origin}${window.location.pathname}?share=${payload.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
      await navigator.clipboard.writeText(url); setNotice("Read-only roadmap link copied. Your background and skill ratings are not included.");
    }
    catch { setNotice("Use your browser address bar to copy this app link. Progress is saved only in this browser."); }
  }
  function importResume() {
    const detected = suggestions.filter((skill) => hasPhrase(resumeText, skill));
    if (!detected.length) { setNotice("No known skill names were detected. Try adding skills manually."); return; }
    const merged = [...new Map([...enteredSkills, ...detected].map((skill) => [normalize(skill), skill])).values()];
    setField("skills", merged.join(", ")); setResumeText(""); setNotice(`Added ${detected.length} skill${detected.length === 1 ? "" : "s"} from the pasted text. Review the chips before generating.`);
  }
  async function evaluateQuiz(node: Milestone) {
    if (!quizAnswer.trim()) { setQuizFeedback("Write a short answer first."); return; }
    setQuizFeedback("Checking your explanation…");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ milestone: node, question: `Evaluate my short answer to this check question: ${node.questions[0]}. My answer: ${quizAnswer.slice(0, 400)}. Give one helpful suggestion.` }) });
      if (!response.ok) throw new Error("Local preview has no AI coach");
      const data = await response.json() as { answer?: string }; setQuizFeedback(data.answer ?? "Add a real example from your own project.");
    } catch { setQuizFeedback(quizAnswer.trim().length > 30 ? "Good start. Check that your answer explains the idea and gives a concrete example." : "Add one or two sentences and a concrete example, then try again."); }
  }

  return <main className={`app-shell ${dark ? "dark-mode" : ""}`} id="top">
    <aside className="sidebar"><a className="brand" href="#top"><span className="brand-mark">c</span> career<span>x</span></a><div className="side-label">WORKSPACE</div>
      <button className={`side-link ${["tree", "list"].includes(tab) ? "active" : ""}`} onClick={() => setTab("tree")}><span>◈</span> Roadmap</button>
      <button className={`side-link ${tab === "skills" ? "active" : ""}`} onClick={() => setTab("skills")}><span>◎</span> Skill gap</button>
      <button className={`side-link ${tab === "planner" ? "active" : ""}`} onClick={() => setTab("planner")}><span>▦</span> Weekly planner</button>
      <button className={`side-link ${tab === "match" ? "active" : ""}`} onClick={() => setTab("match")}><span>⌕</span> Job match</button>
      <div className="side-bottom"><div className="avatar">CX</div><div><b>Your workspace</b><small>Saved on this device</small></div><button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>{dark ? "☼" : "☾"}</button></div>
    </aside>
    <section className="workspace"><header className="topbar"><span className="breadcrumb">Workspace <span>/</span> {tab === "skills" ? "Skill gap" : tab === "planner" ? "Weekly planner" : tab === "match" ? "Job match" : "My roadmap"}</span><div className="top-actions"><span className="save-state"><i/> Saved</span><button className="theme-toggle mobile-theme" onClick={() => setDark((value) => !value)} aria-label="Toggle dark theme">{dark ? "☼" : "☾"}</button><span className="top-avatar">C</span></div></header>
      <div className="content">
        <div className="eyebrow"><span className="sparkle">✳</span> YOUR CAREER, REVERSE-ENGINEERED</div>
        <h1>Build a path to <span>what’s next.</span></h1><p className="intro">Tell us where you want to go. We’ll map the skills, projects, and next steps to help you get there.</p>
        {isShared && <div className="shared-banner">↗ Shared read-only roadmap. Editing and completion are disabled.</div>}
        {!isShared && <form className="setup-card" onSubmit={generate}><div className="form-heading"><div><div className="step-kicker">START WITH YOUR GOAL</div><h2>Your starting point</h2></div><span className="secure-label">✦ Private by design</span></div>
          <div className="form-grid"><label className="field span-two"><span>Dream career</span><input required maxLength={100} value={input.job} onChange={(e) => setField("job", e.target.value)} placeholder="e.g. Product designer"/></label><label className="field span-two"><span>Current background</span><input required maxLength={240} value={input.background} onChange={(e) => setField("background", e.target.value)} placeholder="Your studies, experience, or a career change"/></label>
            <div className="field span-two"><span>Skills you already have <small>Press Enter after each skill</small></span><div className="skill-editor">{enteredSkills.map((skill) => <span className="skill-chip" key={normalize(skill)}>{skill}<button type="button" onClick={() => setField("skills", enteredSkills.filter((item) => normalize(item) !== normalize(skill)).join(", "))} aria-label={`Remove ${skill}`}>×</button></span>)}<input value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={onSkillKey} placeholder={enteredSkills.length ? "Add another skill…" : "Type a skill and press Enter"} list="skill-suggestions"/><datalist id="skill-suggestions">{suggestions.filter((item) => !enteredSkills.some((skill) => normalize(skill) === normalize(item))).map((item) => <option key={item} value={item}/>)}</datalist></div><details className="resume-import"><summary>Paste a resume or LinkedIn summary to find skills</summary><textarea value={resumeText} maxLength={8000} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste text here. It stays in this browser and is not sent to the AI."/><button className="secondary-btn" type="button" onClick={importResume} disabled={!resumeText.trim()}>Detect skills from text</button></details></div>
            <label className="field"><span>Time available each week</span><div className="input-affix"><input type="number" min="1" max="80" value={input.hours} onChange={(e) => setField("hours", Math.min(80, Math.max(1, Number(e.target.value) || 1)))}/><span>hours / week</span></div></label><label className="field"><span>Target timeline</span><select value={input.timeline} onChange={(e) => setField("timeline", e.target.value)}><option>3 months</option><option>6 months</option><option>9 months</option><option>12 months</option><option>Flexible</option></select></label></div>
          <div className="form-footer"><span><span className="lock">♧</span> Your details stay in this browser</span><button className="primary-btn" disabled={busy}>{busy ? <><span className="spinner"/> {loadingCopy[loadingIndex]}</> : <>Build my roadmap <span>↗</span></>}</button></div></form>}
        {busy && <div className="loading-skeleton" aria-live="polite"><div className="skeleton-title"/><div className="skeleton-cols">{[1, 2, 3, 4].map((col) => <div className="skeleton-col" key={col}><i/><i/><i/></div>)}</div><span>{loadingCopy[loadingIndex]}</span>{streamMilestones.length > 0 && <div className="stream-titles">{streamMilestones.map((title, index) => <span className="stream-title" key={`${title}-${index}`}>✦ {title}</span>)}</div>}</div>}
        {notice && <div className="notice" role="status"><span>✦</span> {notice}</div>}
        {error && <div className="error-notice" role="alert"><span>!</span><div><b>AI generation didn’t work</b><p>{error} You can explore the demo, or retry AI generation.</p><div><button className="secondary-btn" onClick={() => void runGeneration(true)}>Retry AI</button> <button className="secondary-btn" onClick={() => { setRoadmap(demoFor(input.job)); setError(""); }}>Use demo plan</button></div></div></div>}
        {roadmap && <>
          <div className="roadmap-toolbar"><div><div className="step-kicker">YOUR PERSONALIZED PLAN</div><h2>{tab === "skills" ? "Your skill gap" : tab === "planner" ? "Your weekly plan" : tab === "match" ? "Job-market match" : `Path to ${input.job}`}</h2></div><div className="toolbar-actions"><span className={`source-pill ${roadmap.source}`}>{isShared ? "↗ SHARED VIEW" : roadmap.source === "ai" ? "✦ AI PERSONALIZED" : "◷ DEMO MODE"}</span>{!isShared && <button className="secondary-btn" disabled={busy} onClick={() => void runGeneration(true)}>↻ Replan my career</button>}<button className="icon-btn" onClick={share} aria-label="Copy share link" title="Copy share link">↗</button><button className="icon-btn" onClick={doPrint} aria-label="Print or save as PDF" title="Print / save PDF">⤓</button></div></div>
          <div className="stats-row"><div className="stat-card progress-stat"><div className="progress-ring" role="img" aria-label={`${finished} of ${roadmap.nodes.length} milestones complete`} style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}><span>{percent}%</span></div><span><small>ROADMAP PROGRESS</small><b>{finished} <i>of {roadmap.nodes.length} milestones</i></b></span></div><div className="stat-card"><span className="stat-icon mint">◷</span><span><small>ESTIMATED LEARNING</small><b>{hoursRemaining} <i>hours left</i></b></span></div><div className="stat-card"><span className="stat-icon peach">⌁</span><span><small>ESTIMATED FINISH</small><b>{weeks} <i>weeks · {estimateDate(weeks)}</i></b></span></div><div className="stat-card streak-stat"><span className="stat-icon flame">♨</span><span><small>LEARNING STREAK</small><b>{streak} <i>{streak === 1 ? "active day" : "active days"}</i></b></span></div></div>
          {!isShared && <div className="time-scenario"><div><b>What if you change your weekly pace?</b><small>Finish in about {weeks} weeks · around {estimateDate(weeks)}</small></div><label><span>{input.hours} hrs / week</span><input aria-label="Adjust weekly learning hours" type="range" min="1" max="40" value={Math.min(40, Math.max(1, input.hours))} onChange={(e) => setField("hours", Number(e.target.value))}/></label></div>}
          {tab === "skills" ? <section className="skill-card"><div className="roadmap-head"><div><h3>Skills for your next step</h3><p>Rate each skill so the roadmap can adjust to what you know.</p></div><span className="timeline-chip">{known.length} milestones covered</span></div><div className="skill-list">{expectedSkills.map((skill) => { const skillRating = ratings[skill] ?? (enteredSkills.some((item) => normalize(item) === normalize(skill)) ? "comfortable" : "beginner"); const level = skillRating; const node = roadmap.nodes.find((item) => item.skills.some((candidate) => normalize(candidate) === normalize(skill)))!; return <div className="skill-row" key={skill}><span className={`skill-check ${level === "comfortable" || level === "strong" ? "known" : ""}`}>{level === "comfortable" || level === "strong" ? "✓" : "◇"}</span><span className="skill-row-copy"><b>{skill}</b><small>{node.title}</small></span><label className="rating-label" htmlFor={`rating-${normalize(skill).replace(/\s/g, "-")}`}>Your level</label><select id={`rating-${normalize(skill).replace(/\s/g, "-")}`} value={skillRating} disabled={isShared} onChange={(e) => setRatings((before) => ({ ...before, [skill]: e.target.value as Rating }))}><option value="beginner">Beginner</option><option value="comfortable">Comfortable</option><option value="strong">Strong</option></select><button className="skill-open" onClick={() => setSelected(node)}>View step ↗</button></div>; })}</div><div className="skill-gap-summary"><b>{skillGapCount} skills still to grow</b><span>Ratings are saved in this browser. Comfortable and strong skills count as known.</span></div></section>
            : tab === "match" ? <section className="match-card"><div className="roadmap-head"><div><h3>Compare your skills with a job post</h3><p>Paste the job description; matching happens in this browser.</p></div><span className="match-score">{matchPercent}% match</span></div><textarea className="job-posting" value={jobPosting} maxLength={12000} onChange={(e) => setJobPosting(e.target.value)} placeholder="Paste the responsibilities and qualifications from a job listing…"/><div className="match-meter"><i style={{ width: `${matchPercent}%` }}/></div><div className="match-results"><b>{expectedSkills.filter((skill) => hasPhrase(matchSkillSet, skill)).length} of {expectedSkills.length} roadmap skills appear in this posting</b><div className="match-skill-list">{expectedSkills.map((skill) => { const found = hasPhrase(matchSkillSet, skill); return <span className={found ? "match-found" : "match-gap"} key={skill}>{found ? "✓" : "＋"} {skill}</span>; })}</div></div><p className="match-note">This is a keyword comparison to help you review the role. It is not a hiring prediction.</p></section>
            : tab === "planner" ? <section className="planner-card"><div className="roadmap-head"><div><h3>Learning schedule</h3><p>Change weekly hours above to see the estimate update instantly.</p></div><label className="planner-hours">Hours / week <input type="number" min="1" max="80" value={input.hours} onChange={(e) => setField("hours", Math.min(80, Math.max(1, Number(e.target.value) || 1)))}/></label></div>{(() => { let left = Math.max(1, input.hours); let weekNo = 1; const groups: { week: number; items: { title: string; hours: number }[] }[] = [{ week: 1, items: [] }]; for (const node of roadmap.nodes) { if (known.includes(node.id) || completed.includes(node.id) || skipped.includes(node.id)) continue; let remaining = node.hours; while (remaining > 0) { if (left === 0) { weekNo++; left = Math.max(1, input.hours); groups.push({ week: weekNo, items: [] }); } const take = Math.min(remaining, left); groups[groups.length - 1].items.push({ title: node.title, hours: take }); remaining -= take; left -= take; } } return groups.map((week) => <div className="planner-week" key={week.week}><div><b>Week {week.week}</b><small>{weekStartLabel(week.week - 1)} · {week.items.reduce((sum, item) => sum + item.hours, 0)}h planned</small></div><ul>{week.items.map((item, i) => <li key={`${item.title}-${i}`}>{item.title}<span>{item.hours}h</span></li>)}</ul></div>); })()}</section>
            : <section className="roadmap-card"><div className="roadmap-head"><div><h3>Your learning roadmap</h3><p>Drag to arrange your view. Choose a milestone to see its plan.</p></div><div className="view-switch"><button className={tab === "tree" ? "selected" : ""} onClick={() => setTab("tree")}>Skill tree</button><button className={tab === "list" ? "selected" : ""} onClick={() => setTab("list")}>By phase</button></div></div><div className="legend"><span><i className="legend-dot done"/> You know this</span><span><i className="legend-dot ready"/> Ready to start</span><span><i className="legend-dot locked"/> Unlocks later</span></div>{tab === "tree" ? <RoadmapGraph key={roadmap.nodes.map((node) => node.id).join(":")} roadmap={roadmap} statusFor={statusFor} onOpen={setSelected}/> : <div className="phases">{roadmap.phases.map((phase, index) => <section className={`phase ${phaseComplete[index] ? "phase-cleared" : ""}`} key={phase.name}><div className="phase-label"><span>0{index + 1}</span><b>{phase.name}</b>{phaseComplete[index] && <em>✓ cleared</em>}<i/></div><div className="node-list">{roadmap.nodes.filter((node) => node.phase === index).map((node, ni) => { const status = statusFor(node); return <button className={`roadmap-node ${status} reveal-card`} style={{ "--reveal": `${ni * 90}ms` } as React.CSSProperties} key={node.id} onClick={() => setSelected(node)}><span className="node-state">{status === "known" ? "✓" : status === "ready" ? "↗" : "⌑"}</span><span className="node-copy"><b>{node.title}</b><small>{status === "known" ? "In your toolkit" : status === "ready" ? "Ready to begin" : `Unlocks after ${node.deps.map((id) => roadmap.nodes.find((x) => x.id === id)?.title).filter(Boolean).join(" + ")}`}</small></span><span className="node-hours">{node.hours}h</span><span className="node-arrow">›</span></button>; })}</div></section>)}</div>}</section>}
          <div className="roles-strip"><div><span className="role-icon">✳</span><div><b>Where this path can take you</b><small>Possible entry-level roles based on your goal</small></div></div><div className="role-chips">{roadmap.roles.map((role) => <span key={role}>{role}</span>)}</div></div>
        </>}
        <footer>Made for your next chapter <span>·</span> Your pace, your path</footer>
      </div>
    </section>
    {selected && roadmap && <><button className="drawer-backdrop" aria-label="Close milestone details" onClick={() => setSelected(null)}/><aside className="detail-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div className="drawer-top"><span className="step-kicker">ROADMAP MILESTONE</span><button className="close-btn" onClick={() => setSelected(null)} aria-label="Close details">×</button></div><span className={`drawer-status ${statusFor(selected)}`}>{statusFor(selected) === "known" ? "✓ IN YOUR TOOLKIT" : statusFor(selected) === "ready" ? "↗ READY TO START" : statusFor(selected) === "skipped" ? "↷ SKIPPED FOR NOW" : "⌑ UNLOCKS LATER"}</span><h2 id="drawer-title">{selected.title}</h2><div className="drawer-time">◷ &nbsp; About {selected.hours} focused learning hours</div>{selected.deps.some((id) => skipped.includes(id)) && <div className="dependency-warning">This step depends on a skipped milestone. Complete or restore that prerequisite to unlock it.</div>}<section className="detail-section"><span className="detail-icon">✳</span><div><b>Why it matters</b><p>{selected.why}</p></div></section><section className="week-card"><div className="week-label"><span>THIS WEEK</span><span>01 / ACTION</span></div><h3>Your action plan</h3><p>{selected.action}</p></section><section className="detail-section"><span className="detail-icon project">⌘</span><div><b>Build as you learn</b><p>{selected.project}</p></div></section><section className="detail-section"><span className="detail-icon">◇</span><div><b>Check your understanding</b><ul>{selected.questions.map((q) => <li key={q}>{q}</li>)}</ul><label className="quiz-label">Try answering one question<input value={quizAnswer} onChange={(e) => setQuizAnswer(e.target.value)} placeholder={selected.questions[0]}/></label><button className="secondary-btn" onClick={() => void evaluateQuiz(selected)} disabled={quizFeedback === "Checking your explanation…"}>Check answer</button>{quizFeedback && <p className="quiz-feedback" role="status">{quizFeedback}</p>}</div></section><div className="drawer-links"><a href={selected.github} target="_blank" rel="noreferrer">⌘ &nbsp; Explore GitHub <span>↗</span></a>{selected.resources.map((url) => <a href={url} key={url} target="_blank" rel="noreferrer">↗ &nbsp; Learning resource <span>↗</span></a>)}</div><section className="drawer-chat"><b>Ask about this milestone</b><p>Ask for a simpler explanation or a different project idea.</p><textarea value={chatText} maxLength={500} onChange={(e) => setChatText(e.target.value)} placeholder="Make this project more beginner-friendly…"/><button className="secondary-btn" onClick={() => void askMilestone()} disabled={chatBusy || !chatText.trim()}>{chatBusy ? "Thinking…" : "Ask AI"}</button>{chatAnswer && <p className="chat-answer" aria-live="polite">{chatAnswer}</p>}</section>{!isShared && <div className="drawer-actions">{skipped.includes(selected.id) ? <button className="secondary-btn" onClick={() => setSkipped((before) => before.filter((id) => id !== selected.id))}>Restore milestone</button> : <button className="secondary-btn" onClick={() => { setSkipped((before) => [...before, selected.id]); setSelected(null); }}>Skip for now</button>}<button className="primary-btn drawer-done" onClick={() => completeMilestone(selected)}>✓ &nbsp; Mark milestone as complete</button></div>}</aside></>}
    {celebrate && <div className="confetti-burst" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties}/>)}</div>}
  </main>;
}
