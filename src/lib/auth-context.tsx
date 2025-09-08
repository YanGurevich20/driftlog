'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  needsOnboarding: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      // Clean up previous user listener
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }
      
      if (firebaseUser) {
        // Set up real-time listener for user document
        unsubscribeUser = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.data() as User & { onboardingCompleted?: boolean };
              setUser(userData);
              setNeedsOnboarding(!userData.onboardingCompleted);
            } else {
              // New user - needs onboarding
              setNeedsOnboarding(true);
              // Set minimal user data for onboarding
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || '',
                displayName: firebaseUser.displayName || '',
                photoUrl: firebaseUser.photoURL || undefined,
                displayCurrency: 'USD',
                connectedUserIds: [],
                createdAt: new Date(),
                categories: {
                  expense: [],
                  income: [],
                },
              } as User);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to user document:', error);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setNeedsOnboarding(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, needsOnboarding, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}