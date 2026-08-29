import { requireAdmin } from "../../lib/auth/admin";
import {
  listFamiliesForAdmin,
  listModuleCatalogForAdmin,
  listModuleRequestsForAdmin,
} from "../../db/admin-queries";
import { AdminView } from "../components/admin-view";

export default async function AdminPage() {
  await requireAdmin();
  const [families, moduleCatalog, moduleRequests] = await Promise.all([
    listFamiliesForAdmin(),
    listModuleCatalogForAdmin(),
    listModuleRequestsForAdmin(),
  ]);

  return (
    <AdminView families={families} moduleCatalog={moduleCatalog} moduleRequests={moduleRequests} />
  );
}
