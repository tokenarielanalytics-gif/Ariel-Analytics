import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, signInWithPopup, googleProvider, signOut } from "./firebase";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Algo deu errado</h1>
          <p className="text-gray-400 mb-6 max-w-md">
            Ocorreu um erro inesperado. Por favor, tente recarregar a página ou entre em contato com o suporte se o problema persistir.
          </p>
          <pre className="bg-black/50 p-4 rounded-xl text-xs text-red-400 overflow-auto max-w-full mb-6">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-cyan-neon text-navy-900 rounded-xl font-bold"
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ ...firebaseUser, ...userDoc.data() });
          } else {
            // Create new user profile
            const newUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              plan: "FREE",
              analysesCount: 0,
              role: firebaseUser.email === "tokenarielanalytics@gmail.com" ? "admin" : "user"
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            setUser({ ...firebaseUser, ...newUser });
          }
        } catch (error) {
          console.error("Error fetching user data", error);
          setUser(firebaseUser); // Fallback to basic auth user
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-neon border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {!user ? (
        <LandingPage onStart={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </ErrorBoundary>
  );
}
