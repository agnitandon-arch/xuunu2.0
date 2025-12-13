import LoginScreen from "../LoginScreen";

export default function LoginScreenExample() {
  return (
    <LoginScreen 
      onLogin={(email, password) => console.log("Login:", email, password)}
      onSignUp={() => console.log("Sign up clicked")}
    />
  );
}
