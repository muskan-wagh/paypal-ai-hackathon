import LandingHero from "@/components/landing/landing-hero";
import {
  DashboardPreview,
  Features,
  FinalCta,
  FlowStrip,
  HowItWorks,
  RoleWorkflow,
  SecuritySection,
  TrustConcept,
} from "@/components/landing/landing-sections";
import PublicHeader from "@/components/public-header";
import SiteFooter from "@/components/site-footer";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader user={user} />
      <main>
        <LandingHero />
        <FlowStrip />
        <TrustConcept />
        <HowItWorks />
        <Features />
        <RoleWorkflow />
        <DashboardPreview />
        <SecuritySection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
