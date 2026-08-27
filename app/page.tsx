import { GroundControlApp } from "./components/ground-control-app";
import { getDefaultFamilyId, getFamilyBundle } from "../db/queries";

export default async function Home() {
  const familyId = await getDefaultFamilyId();
  const { members, events, boardItems } = await getFamilyBundle(familyId);

  return (
    <GroundControlApp
      familyId={familyId}
      family={members}
      events={events}
      initialBoard={boardItems}
    />
  );
}
