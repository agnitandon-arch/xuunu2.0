import TrackEntryScreen from "../TrackEntryScreen";

export default function TrackEntryScreenExample() {
  return (
    <TrackEntryScreen onSave={() => console.log("Entry saved")} />
  );
}
