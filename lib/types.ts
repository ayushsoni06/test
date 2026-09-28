/* Shapes shared by the page, the editor, the API and the seed scripts. */

export type Media = { kind: "image" | "video"; url: string; alt?: string };

export type Sub = { title: string; body: string; label?: string; items?: string[] };

export type Phase = {
  id: string;
  group: string;
  title: string;
  short: string;
  weeks: number;
  subs?: Sub[];
  body?: string[];
  label?: string;
  items?: string[];
  list?: [string, string][];
  added?: boolean;
};

export type Group = { key: string; name: string };

export type Plan = { id: string; name: string; phases: string[] | "all" };

export type Content = {
  rate?: number;
  texts?: Record<string, string>;
  phases?: Phase[];
  groups?: Group[];
};

export type Idea = { caption: string; media: Media[] };

export type ProposalState = {
  client: { company: string; contact: string; date: string };
  preparedBy: string;
  palette?: "hex";
  hero: { media: Media[] };
  slots: [string, string, string, string];
  display: Record<string, "rotate" | "single">;
  /** Per-proposal project media overrides. Empty or missing = use the library. */
  media?: Record<string, Media[]>;
  /** Per-proposal team photo overrides, keyed by member name. */
  photos?: Record<string, string>;
  ideas: Idea[];
  content: Content;
};

/* ---------- library ---------- */

export type Project = {
  slug: string;
  title: string;
  lede: string;
  services: string;
  year: number;
  tags: string[];
  palette: [string, string];
  url?: string | null;
  sort: number;
};

export type TeamMember = { id: string; name: string; role: string; photo: string | null; sort: number; active: boolean };

export type Company = {
  id: string;
  name: string;
  url: string | null;
  logo: string | null;
  logoKeepColors: boolean;
  figure: string | null;
  showInClients: boolean;
  sort: number;
};

export type Testimonial = {
  id: string;
  companyId: string;
  kind: string;
  quote: string[];
  name: string;
  nameUrl: string | null;
  role: string;
  sort: number;
  active: boolean;
};

export type Library = {
  projects: Project[];
  projectMedia: Record<string, Media[]>;
  team: TeamMember[];
  companies: Company[];
  testimonials: Testimonial[];
};

export type ProposalStatus = "draft" | "published" | "archived";

export type ProposalRow = {
  id: string;
  slug: string;
  client_company: string;
  status: ProposalStatus;
  draft_state: ProposalState;
  published_state: ProposalState | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};
