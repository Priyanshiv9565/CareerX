// The contract between the AI service and the frontend.
export type NodeStatus = "known" | "ready" | "locked" | "skipped";

export interface UserInput {
  job: string;
  background: string;
  skills: string;
  hours: number;
  timeline: string;
}

export interface Phase {
  name: string;
}

export interface Milestone {
  id: string;
  title: string;
  phase: number; // index into phases
  hours: number;
  deps: string[]; // ids of prerequisite milestones
  keys: string[]; // keywords used to detect already-known skills
  skills: string[];
  why: string;
  action: string;
  project: string;
  github: string;
  questions: string[];
  resources: string[];
}

export interface Roadmap {
  source: "ai" | "demo";
  phases: Phase[];
  nodes: Milestone[];
  roles: string[]; // realistic entry-level roles
}
