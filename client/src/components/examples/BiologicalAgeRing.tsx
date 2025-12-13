import BiologicalAgeRing from "../BiologicalAgeRing";

export default function BiologicalAgeRingExample() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <BiologicalAgeRing biologicalAge={32} chronologicalAge={38} />
    </div>
  );
}
