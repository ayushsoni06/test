import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProposal } from "@/components/proposal/ProposalPage";
import { getLibrary, getPublished } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const p = await getPublished((await params).slug);
  return { title: p ? `HEX + ${p.state.client.company} — Proposal` : "Not found" };
}

export default async function ProposalRoute({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const [p, lib] = await Promise.all([getPublished(slug), getLibrary()]);
  if (!p) notFound();
  return <PublicProposal state={p.state} lib={lib} slug={slug} />;
}
