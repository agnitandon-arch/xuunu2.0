import LogHealthScreen from "../LogHealthScreen";

export default function LogHealthScreenExample() {
  return (
    <div className="h-screen flex flex-col">
      <LogHealthScreen onSave={() => console.log("Entry saved")} />
    </div>
  );
}
