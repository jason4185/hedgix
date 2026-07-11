import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/hedgix/AppLayout";
import { Hero } from "@/components/hedgix/Hero";
import { EditorialIntro } from "@/components/hedgix/EditorialIntro";
import { SplitFeature } from "@/components/hedgix/SplitFeature";
import { ProductGrid } from "@/components/hedgix/ProductGrid";
import { MediaMetrics } from "@/components/hedgix/MediaMetrics";
import { HowItWorks } from "@/components/hedgix/HowItWorks";
import { Dashboard } from "@/components/hedgix/Dashboard";
import { PoolPreview } from "@/components/hedgix/PoolPreview";
import { TransparencySection } from "@/components/hedgix/TransparencySection";
import { FinalCTA } from "@/components/hedgix/FinalCTA";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppLayout>
      <Hero />
      <EditorialIntro />
      <SplitFeature />
      <ProductGrid />
      <MediaMetrics />
      <HowItWorks />
      <Dashboard />
      <PoolPreview />
      <TransparencySection />
      <FinalCTA />
    </AppLayout>
  );
}
