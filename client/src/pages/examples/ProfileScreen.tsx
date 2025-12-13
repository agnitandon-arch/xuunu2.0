import ProfileScreen from "../ProfileScreen";

export default function ProfileScreenExample() {
  return (
    <div className="h-screen flex flex-col">
      <ProfileScreen onLogout={() => console.log("Logout clicked")} />
    </div>
  );
}
