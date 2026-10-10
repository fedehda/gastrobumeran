import { isOfflineMode } from "@/lib/config/app-mode";
import AdminPage from "@/app/admin/page";
import LandingPage from "@/components/landing/LandingPage";

export const dynamic = "force-dynamic";

export default function HomePage() {
  if (isOfflineMode()) {
    return <AdminPage />;
  }

  return <LandingPage />;
}
