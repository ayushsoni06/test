/* The base template. Editing a proposal never touches this file: proposals store overrides in `content`. */
import type { Group, Phase, Plan, ProposalState } from "../lib/types.ts";

export const BASE_RATE = 7.5; // $K per week, the house default

export const DEFAULT_COVER =
  process.env.DEFAULT_COVER_VIDEO || "https://pub-90a8fdb55fdc4673a260975cda4e4309.r2.dev/Export%20(2).mp4";

/* Flip to false to show plans collapsed by default. */
export const PLAN_DETAILS_OPEN = true;

export const DEFAULT_CUSTOM = ["moodboarding", "explorations", "iteration", "logomarks"];

export const PHASES_BASE: Phase[] = [
  {id:"moodboarding",group:"Brand",title:"Moodboarding",short:"Strategy",weeks:1,subs:[
    {title:"Brand strategy",body:"The goal here is to craft a unique brand narrative and thesis. This phase often involves a lot of open conversation and aggregated insights. We avoid a purely statistical approach to brand strategy and like to get in the weeds through thoughtful communication, so we can put our finger on what makes you authentically you.",label:"Deliverables",items:["Brand research findings","Messaging and tone of voice"]},
    {title:"Moodboards",body:"Before we launch full steam into creative work, we develop moodboards that visually showcase the findings from brand research. They pull references from a wide range of sources that come together to form cohesive visual systems.",label:"Deliverables",items:["3–5 unique moodboards"]}]},
  {id:"explorations",group:"Brand",title:"Brand explorations",short:"Brand explorations",weeks:1,body:["We treat each brand concept as its own separate identity and prepare a presentation that begins with a core brand idea, messaging and tone of voice. Each concept includes its own art direction, typography, visual system and design language. We typically pitch 3 core brand directions to start.","In these explorations we try a wide range of visual techniques to conceptualize each direction."],label:"Deliverables",items:["Core brand presentations","Visual explorations"]},
  {id:"iteration",group:"Brand",title:"Brand iteration and revision",short:"Iterations & revisions",weeks:1,body:["This is where we really nail down the brand. We trim the waste, extend the brand and bring in creatives to take it to the next level. These changes are usually holistic iterations, not “make the colour more sharp”.","By the end of this stage, the brand is developed to its final form."],label:"Services",items:["Illustration","Motion design","Graphic design"]},
  {id:"logomarks",group:"Brand",title:"Logomarks",short:"Logomarks",weeks:1,body:["We spend one full week iterating on logomark options and trying out a cohort of ideas. This stage is much more iterative, with a tighter feedback loop, since in our experience a logomark needs a lot of back and forth.","If we move faster here, we spend the extra time building out the brand kit."]},
  {id:"development",group:"Brand",title:"Brand development",short:"Brand assets",weeks:2,body:["This is the core brand execution that typically involves building out the brand further into specific deliverables that will enable you to use this brand at scale. This process involves both producing net new creative assets and documenting + defining existing brand assets."],list:[["Social media assets","Defining a collection of social media assets (posts, banners, logos, etc)"],["Illustration & imagery kit","Documenting a collection of brand artefacts"],["Visual system","Defining and documenting a visual language"],["General brand usage","Extending usage across different branding touchpoints"],["Conceptual UI","Exploring opportunities to express the brand through UI and product screens"],["Custom brand tooling","Building custom tools for scaling brand artefacts"],["Sub-branding","Extending the system into sub-brands for products, events and initiatives"]]},
  {id:"webdesign",group:"Website",title:"Website design",short:"Website design",weeks:2,body:["Design and iteration of a marketing website of up to 5 pages, built on our brand guidelines and design language. We create the layouts, illustrations and diagrams, animations, iconography and any other design language assets required."]},
  {id:"webdev",group:"Website",title:"Development",short:"Website development",weeks:1,body:["We develop the final designs in Webflow, Framer or Next.js, set up stylesheets, build any CMS collections, add a class-naming system where it applies, and make the site seamless across devices. Up to 5 pages."]},
  {id:"deck",group:"Extended assets",title:"Deck",short:"Deck",weeks:1,body:["A custom branded deck in Figma Slides, exportable as PDF, Google Slides or PowerPoint, built on the new visual language. Up to 10 custom layouts."],label:"Deliverables",items:["Sales deck and slideware templates"]},
  {id:"merch",group:"Extended assets",title:"Merchandise",short:"Merch",weeks:1,body:["Ideation and concept exploration for custom branded merchandise."],label:"Deliverables",items:["Merchandise concepts","Event mockups: booth, banners, signage","Internal branding","Conceptual sub-brands"]},
  {id:"video",group:"Extended assets",title:"Brand video",short:"Brand video",weeks:1,body:["The best brands come to life with something that truly grabs attention. Here we use the brand assets to put together a unique animated launch video announcing the new brand system."]},
];

export const GROUPS_BASE: Group[] = [
  { key: "Brand", name: "Brand" },
  { key: "Website", name: "Website" },
  { key: "Extended assets", name: "Extended assets" },
];

export const PLANS: Plan[] = [
  {id:"brand",name:"Full brand",phases:["moodboarding","explorations","iteration","logomarks","development"]},
  {id:"core",name:"Core brand + website",phases:["moodboarding","explorations","iteration","logomarks","webdesign","webdev"]},
  {id:"fullweb",name:"Full brand + website",phases:["moodboarding","explorations","iteration","logomarks","development","webdesign","webdev"]},
  {id:"cycle",name:"Full-cycle",phases:"all"},
];

export const NAV: [string, string][] = [
  ["approach","Approach"],["work","Recent work"],["notes","Client notes"],["process","Process and timelines"],["team","Team"],
  ["overview","Overview"],["next-steps","Next steps"],["faq","FAQ"],["ideas","Bonus: early ideas"],
];

/*
 * Default static copy, keyed exactly like the reference's data-t keys
 * (`<section id or first class>:<n>` in document order), so saved `content.texts` stay compatible.
 * `<span data-bind="company">` and `<span data-rate>` are filled in at render time.
 */
export const BASE_TEXT: Record<string, string> = {
  "hero:1": "We’ve taken the time to internally review your project and summarized our key findings in this document. It covers notes from our review, goals for the project, pricing, timelines and relevant work. The goal is to briefly explain what a partnership with HEX could look like.",

  "approach:1": "Approach",
  "approach:2": "Why HEX",
  "approach:3": "We don’t work in silos or with a team of 20 designers. We keep delegation lean and collaborate with a network of independent creatives as each project needs. A few qualities and processes that give us an edge over other agencies, studios and freelancers:",
  "approach:4": "<span>01</span>Small on purpose",
  "approach:5": "We take real interest in our clients and love to learn the small details that make a company special. We’re not a massive studio, and we place high priority on building lasting relationships.",
  "approach:6": "<span>02</span>We think together",
  "approach:7": "We don’t do echo chambers and single-person Figma files. Our work is vetted, scribbled on and commented on by other creatives, so you get the full exposure of working with a collaborative studio.",
  "approach:8": "<span>03</span>First principles thinking",
  "approach:9": "Our process is a product of years of iteration. Each stage was built from the ground up by questioning the design process. We’ve killed the waste.",
  "approach:10": "<span>04</span>We’ve led massive revamps",
  "approach:11": "We’ve led large and complex brand, web and product projects and are comfortable in fast-paced, high-pressure environments.",
  "approach:12": "<span>05</span>We learn and adapt",
  "approach:13": "We’re always working on new shit for new people. We’ve learned how to learn, and we adapt quickly to what each project needs.",
  "approach:14": "<span>06</span>We will not waste your time",
  "approach:15": "Our goal is to deliver the highest quality output in the least amount of time. We move fast, and with clarity, every single time.",

  "work:1": "Recent work",
  "work:2": "Also worth a look: <a href=\"https://www.hex.inc/work\" target=\"_blank\" rel=\"noopener\">all our work</a>, <a href=\"https://www.hex.inc/web-work\" target=\"_blank\" rel=\"noopener\">web work</a>, <a href=\"https://hex.inc/work-deck\" target=\"_blank\" rel=\"noopener\">the work deck</a>, <a href=\"https://medium.com/@ayushsoni_io\" target=\"_blank\" rel=\"noopener\">process breakdowns</a>, <a href=\"https://www.hex.inc/writings\" target=\"_blank\" rel=\"noopener\">writings</a> and <a href=\"https://www.hex.inc/swipe-file\" target=\"_blank\" rel=\"noopener\">our swipe file</a>.",

  "notes:1": "Client notes",
  // notes:2 is the live "n of N" counter; it is not editable.
  "notes:3": "Recent clients",

  "process:1": "Process &amp; timelines",
  "process:2": "How we’d run it",
  "process:3": "We work with speed and clarity, and skip unnecessary meetings and bureaucratic phases. This is a rough outline of the time we usually take on projects with a scope like yours. We may overlap stages to move faster and make room for iteration as we see fit.",

  "team:1": "Team",
  "team:2": "Core collaborators",
  "team:3": "Our studio model lets us work with a cohort of 3D specialists, animators, illustrators, copywriters and developers to bring that special layer of detail into every project. We keep the team lean, without layers of project managers.",
  "team:4": "These are the people who will work on this project. Additional talent may be brought on as the work needs it.",

  "overview:1": "Overview",
  "overview:2": "Four ways to work together, or build your own",
  "overview:3": "Prepared for <span data-bind=\"company\">Fireflies</span> by HEX Studio. Pick a scope and the timeline above updates to match.",

  "next-steps:1": "Next steps",
  "next-steps:2": "After proposal review and approval",
  "next-steps:3": "When you’re ready, we send over a contract.",
  "next-steps:4": "We communicate through the channels we agree on, usually email or Slack.",
  "next-steps:5": "Everything project-related lives in your <b>Figma Updates</b> file: moodboards, progress and more.",
  "next-steps:6": "We get started.",

  "faq:1": "FAQ",
  "faq:2": "Questions and answers",
  "faq:3": "How do we get your best work?",
  "faq:4": "Our best work comes when clients stay on top of feedback loops and client-side deliverables. Acting fast and making decisions is what makes the difference in hitting timelines and shipping something high quality.",
  "faq:5": "How do we communicate?",
  "faq:6": "We’re big fans of asynchronous communication and like to use Slack and Loom for project management and feedback. We can also schedule weekly meetings to walk through progress and deliverables. Usually we start with calls while we learn to work together, then move to async updates via Loom as the project progresses.",
  "faq:7": "How do you charge?",
  "faq:8": "We bill at <span data-rate=\"\">$7.5K</span> per week, tied to specific deliverables and timelines.",

  "ideas:1": "Bonus: early ideas",
  "ideas:2": "First thoughts, before we’ve even started",

  "foot:1": "<span class=\"mark\">HEX</span> <span style=\"color:var(--ink-60)\">is a full cycle creative studio for emergent technology companies.</span>",
};

/** Starting state for /admin/new. */
export function baseState(): ProposalState {
  return {
    client: { company: "Client", contact: "Contact name", date: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }) },
    preparedBy: "Ayush Soni",
    hero: { media: [] },
    slots: ["grafana", "sim", "anthrogen", "conversion"],
    display: {},
    ideas: [],
    content: {},
  };
}
