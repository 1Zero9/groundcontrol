import { requireAdmin } from "../../lib/auth/admin";
import { listFamiliesForAdmin } from "../../db/admin-queries";
import { AdminView } from "../components/admin-view";

export default async function AdminPage() {
  await requireAdmin();
  const families = await listFamiliesForAdmin();

  return <AdminView families={families} />;
}
