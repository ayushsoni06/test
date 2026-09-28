"use client";
import type { Library, ProposalState } from "@/lib/types";
import { ProposalProvider } from "./context";
import { Overview, NextSteps } from "./Plans";
import { Process } from "./Process";
import { Approach, Cover, Faq, Footer, Frame, Hero, Ideas, Notes, Team, Work } from "./Sections";

export function ProposalBody() {
  return (
    <>
      <Cover />
      <Frame>
        <Hero />
        <Approach />
        <Work />
        <Notes />
        <Process />
        <Team />
        <Overview />
        <NextSteps />
        <Faq />
        <Ideas />
        <Footer />
      </Frame>
    </>
  );
}

/** Read-only proposal, as clients see it. */
export function PublicProposal({ state, lib, slug }: { state: ProposalState; lib: Library; slug: string }) {
  return (
    <ProposalProvider state={state} lib={lib} slug={slug}>
      <ProposalBody />
    </ProposalProvider>
  );
}
