import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getRedirectResult,
  type AuthError
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    googleProvider.setCustomParameters({ prompt: "select_account" });
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user to database
        try {
          await apiRequest("POST", "/api/users/sync", {
            id: user.uid,
            email: user.email,
          });
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch((error: AuthError) => {
      console.error("Google redirect sign-in failed:", error);
    });
  }, []);

  const signInWithGoogle = async () => {
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (navigator as any).standalone);
    if (isMobile || isStandalone) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const authError = error as AuthError | undefined;
      if (
        authError?.code === "auth/popup-blocked" ||
        authError?.code === "auth/operation-not-supported-in-this-environment" ||
        authError?.code === "auth/popup-closed-by-user" ||
        authError?.code === "auth/cancelled-popup-request" ||
        authError?.code === "auth/unauthorized-domain"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (credential.user && !credential.user.emailVerified) {
      try {
        await sendEmailVerification(credential.user);
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
