import HomeScreen from "../HomeScreen";

export default function HomeScreenExample() {
  return (
    <div className="h-screen flex flex-col">
      <HomeScreen 
        userName="Sarah"
        onLogClick={() => console.log("Log health clicked")}
      />
    </div>
  );
}
