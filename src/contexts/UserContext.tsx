import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, GoogleAuthProvider, getRedirectResult, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  familyId: string;
  role: 'parent' | 'child';
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthLoading: boolean;
  globalError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  isAuthLoading: true,
  globalError: null,
  login: async () => {},
  logout: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    // Check for guest mode first
    const guestFamilyId = localStorage.getItem('guest_family_id');
    const guestRole = localStorage.getItem('guest_role') as 'parent' | 'child' | null;

    if (guestFamilyId && guestRole) {
      setProfile({ familyId: guestFamilyId, role: guestRole });
      setIsAuthLoading(false);
      return;
    }

    // Check for redirect errors
    getRedirectResult(auth).catch((error: any) => {
      console.error("Redirect error:", error);
      setGlobalError(error.code + ': ' + error.message);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        try {
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            const defaultProfile: UserProfile = {
              familyId: currentUser.uid,
              role: currentUser.isAnonymous ? 'child' : 'parent',
            };
            await setDoc(userDocRef, defaultProfile);
          }
        } catch (err) {
          console.error("Error ensuring user profile exists:", err);
        }

        unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setIsAuthLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setIsAuthLoading(false);
        });
      } else {
        setProfile(null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async () => {
    setGlobalError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setGlobalError(error.code + ': ' + error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('guest_family_id');
      localStorage.removeItem('guest_role');
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, profile, isAuthLoading, globalError, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
