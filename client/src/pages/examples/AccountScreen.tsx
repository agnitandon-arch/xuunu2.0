import AccountScreen from "../AccountScreen";

export default function AccountScreenExample() {
  return (
    <AccountScreen onLogout={() => console.log("Logout clicked")} />
  );
}
