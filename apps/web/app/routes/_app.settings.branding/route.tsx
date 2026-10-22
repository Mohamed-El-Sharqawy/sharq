// `/settings/branding` under the `_app` layout (SPEC §11 branding row —
// admin only, FR-SET-12).
import { AdminGate } from "../../features/auth/admin-gate";
import { useBrandingScreen } from "../../features/settings/branding/logic";
import { BrandingView } from "../../features/settings/branding/view";

export default function BrandingRoute() {
  return (
    <AdminGate>
      <BrandingScreen />
    </AdminGate>
  );
}

function BrandingScreen() {
  return <BrandingView screen={useBrandingScreen()} />;
}
