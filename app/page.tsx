import { GroundControlApp } from "./components/ground-control-app";
import { events, familyMembers, initialBoardItems } from "../src/data/mock-data";

export default function Home() {
  return <GroundControlApp family={familyMembers} events={events} initialBoard={initialBoardItems} />;
}
