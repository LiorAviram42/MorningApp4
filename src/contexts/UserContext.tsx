import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, getRedirectResult, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  familyId: string;
  role: 'parent' | 'child';
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  authError: string | null;
  isAuthLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  authReady: false,
  authError: null,
  isAuthLoading: false,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeProfile: (() => void) | undefined;

    const init = async (forceLoad = false) => {
      // Check for guest mode first
      const guestFamilyId = localStorage.getItem('guest_family_id');
      const guestRole = localStorage.getItem('guest_role') as 'parent' | 'child' | null;

      if (guestFamilyId && guestRole) {
        setProfile({ familyId: guestFamilyId, role: guestRole });
        setAuthReady(true);
        return;
      }

      // Check if we have a saved Firebase session or a pending auth redirect
      const hasSavedSession = Object.keys(localStorage).some(key => 
        key.toLowerCase().includes('firebase:authuser') || 
        key.toLowerCase().includes('firebase:auth')
      );
      const authPending = sessionStorage.getItem('auth_pending');
      
      if (!hasSavedSession && !forceLoad && !authPending) {
        setAuthReady(true);
        return;
      }

      // Clear the pending flag since we are loading auth now
      if (authPending) {
        sessionStorage.removeItem('auth_pending');
      }

      // If we are loading auth, make sure we aren't marked as "ready" with a null user
      setAuthReady(false);
      setIsAuthLoading(true);
      try {
        // Check for redirect result first
        try {
          await getRedirectResult(auth);
        } catch (redirectErr: any) {
          console.error("Redirect result error:", redirectErr);
          setAuthError(redirectErr.message);
        }

        unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
          setUser(currentUser);
          setIsAuthLoading(false);
          
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
              setAuthReady(true);
            }, (error) => {
              console.error("Error fetching user profile:", error);
              setAuthReady(true);
            });
          } else {
            setProfile(null);
            setAuthReady(true);
          }
        });
      } catch (err: any) {
        console.error("Error initializing Auth:", err);
        setAuthError(err.message);
        setIsAuthLoading(false);
        setAuthReady(true);
      }
    };

    const handleTrigger = () => {
      console.log("Auth trigger received, loading Firebase Auth...");
      init(true);
    };

    window.addEventListener('firebase-auth-trigger', handleTrigger);
    init();

    return () => {
      window.removeEventListener('firebase-auth-trigger', handleTrigger);
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, profile, authReady, authError, isAuthLoading }}>
      {children}
    </UserContext.Provider>
  );
};
