import React, { useState, useEffect, useCallback } from 'react';
import { KIDS } from '../constants';
import { KidId } from '../types';
import { sounds, safeVibrate } from '../utils/sounds';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';
import { useUser } from '../contexts/UserContext';
import FamilySettingsModal from './FamilySettingsModal';
import { Plus, Minus, UserCircle, Key, X } from 'lucide-react';

interface Props {
  onSelectKid: (kidId: KidId) => void;
  hasMagicBg?: boolean;
}

export default function HomeScreen({ onSelectKid }: Props) {
  const { user, profile, login, logout } = useUser();
  const [animatingKid, setAnimatingKid] = useState<KidId | null>(null);
  const [showFamilySettings, setShowFamilySettings] = useState(false);
  const [showCodeLogin, setShowCodeLogin] = useState(false);
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [googleLoginError, setGoogleLoginError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [stars, setStars] = useState<Record<KidId, number>>({
    yuvali: 0,
    maayani: 0,
    palgi: 0
  });

  useEffect(() => {
    if (user && sessionStorage.getItem('show_login_success') === 'true') {
      setShowSuccess(true);
      sessionStorage.removeItem('show_login_success');
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#C5E9F1');
  }, []);

  useEffect(() => {
    if (!user || !profile) {
      // Load from local storage if not logged in
      const newStars = { ...stars };
      (Object.keys(KIDS) as KidId[]).map((kidId) => {
        const savedStars = localStorage.getItem(`stars_${kidId}`);
        if (savedStars) {
          newStars[kidId] = parseInt(savedStars, 10);
        }
      });
      setStars(newStars);
      return;
    }

    // Load from Firestore if logged in
    const unsubscribes = (Object.keys(KIDS) as KidId[]).map((kidId) => {
      const docRef = doc(db, 'users', profile.familyId, 'kids', kidId);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setStars(prev => ({ ...prev, [kidId]: data.stars || 0 }));
        } else {
          setStars(prev => ({ ...prev, [kidId]: 0 }));
        }
      }, (error) => {
        console.error('Firestore Error: ', error);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, profile]);

  useEffect(() => {
    console.log("HomeScreen rendered, showFamilySettings:", showFamilySettings, "animatingKid:", animatingKid);
  }, [showFamilySettings, animatingKid]);

  const handleSelect = (kidId: KidId) => {
    console.log("handleSelect called for kid:", kidId);
    safeVibrate(5);
    sounds.playSelect();
    setAnimatingKid(kidId);
    setTimeout(() => {
      onSelectKid(kidId);
    }, 150);
  };

  const updateStars = async (kidId: KidId, delta: number) => {
    const newCount = Math.max(0, stars[kidId] + delta);
    
    if (!user || !profile) {
      localStorage.setItem(`stars_${kidId}`, newCount.toString());
      setStars(prev => ({ ...prev, [kidId]: newCount }));
      return;
    }

    try {
      const docRef = doc(db, 'users', profile.familyId, 'kids', kidId);
      await setDoc(docRef, { stars: newCount }, { merge: true });
    } catch (error) {
      console.error('Error updating stars:', error);
    }
  };

  const handleCodeLogin = async () => {
    if (!loginCode || loginCode.length < 6) return;
    
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      const codeDoc = await getDoc(doc(db, 'joinCodes', loginCode.toUpperCase()));
      if (codeDoc.exists()) {
        const data = codeDoc.data();
        // Store family info in local storage for "guest" access
        localStorage.setItem('guest_family_id', data.familyId);
        localStorage.setItem('guest_role', data.role);
        // Force a reload to pick up the new "profile"
        window.location.reload();
      } else {
        setLoginError('קוד לא חוקי');
      }
    } catch (err) {
      console.error(err);
      setLoginError('שגיאה בהתחברות');
    }
    setIsLoggingIn(false);
  };

  const closeFamilySettings = useCallback(() => setShowFamilySettings(false), []);

  const handleLogin = async () => {
    setGoogleLoginError('');
    try {
      sessionStorage.setItem('show_login_success', 'true');
      await login();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setGoogleLoginError(`שגיאה: הדומיין ${window.location.hostname} לא מאושר ב-Firebase. אנא הוסף אותו ב-Authorized domains ב-Firebase Console.`);
      } else {
        setGoogleLoginError(`שגיאת התחברות: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col items-center h-full w-full relative overflow-hidden box-border pb-24">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      <div className="flex-1 flex flex-col justify-center z-10 w-full">
        <h1 className="text-5xl font-bold text-[#333] text-center drop-shadow-sm">בוקר טוב!</h1>
      </div>
      
      <div className="flex gap-6 justify-center w-full z-10 px-4 shrink-0">
        {(Object.keys(KIDS) as KidId[]).map((kidId) => {
          const kid = KIDS[kidId];
          const isAnimating = animatingKid === kidId;
          
          return (
            <div 
              key={kidId} 
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => handleSelect(kidId)}
            >
              <div 
                className={`w-[100px] h-[100px] rounded-full border border-[#333] bg-white overflow-hidden shadow-[0px_4px_0px_#333] transition-all duration-75 active:translate-y-[4px] active:shadow-none relative ${isAnimating ? 'translate-y-[4px] shadow-none' : ''}`}
              >
                <img 
                  src={kid.profileImg} 
                  alt={kid.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${kid.name}&backgroundColor=b6e3f4`;
                  }}
                />
              </div>
              <div className="mt-4 text-xl font-black text-[#333] tracking-tight flex items-center gap-1">
                {kid.name}
              </div>
              
              <div className="flex flex-col items-center min-h-[32px]">
                {stars[kidId] > 0 && (
                  <div className="mt-1 flex flex-row items-center justify-center gap-1 bg-white/30 backdrop-blur-[4px] px-2 py-0.5 rounded-full border border-white/20 mix-blend-overlay">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(stars[kidId], 5) }).map((_, i) => (
                        <svg key={i} viewBox="0 0 24 24" className="w-3.5 h-3.5">
                          <path 
                            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                            fill="#ffea92"
                            stroke="#000"
                            strokeWidth="1.2"
                          />
                        </svg>
                      ))}
                      {stars[kidId] > 5 && <span className="text-[9px] font-black text-[#333]/70 ml-0.5">+{stars[kidId] - 5}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col justify-center z-10 w-full">
        <h2 className="text-[#333] text-2xl font-black tracking-tight text-center">
          מוכנים? קדימה לדרך!
        </h2>
      </div>

      {/* Parent/Child Login Section */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 z-10">
        {!user && !profile ? (
          <div className="flex flex-col items-center gap-3">
            {googleLoginError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-xs max-w-[250px] text-center mb-2 shadow-sm">
                {googleLoginError}
              </div>
            )}
            {!showCodeLogin ? (
              <>
                <button 
                  type="button"
                  onClick={() => {
                    safeVibrate(5);
                    sounds.playSelect();
                    handleLogin();
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-[#333] bg-white border-2 border-[#333] rounded-full px-6 py-2 cursor-pointer shadow-[0_4px_0_#333] active:translate-y-[4px] active:shadow-none transition-all"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  התחברות הורה
                </button>
                <button 
                  onClick={() => {
                    safeVibrate(5);
                    sounds.playSelect();
                    setShowCodeLogin(true);
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-[#333]/60 bg-white/50 border border-[#333]/20 rounded-full px-4 py-1.5 cursor-pointer hover:bg-white transition-all"
                >
                  <Key size={16} />
                  התחברות ילד עם קוד
                </button>
              </>
            ) : (
              <div className="bg-white p-4 rounded-2xl border-2 border-[#333] shadow-[0_4px_0_#333] flex flex-col gap-3 w-[260px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#333]">הזן קוד משפחה</span>
                  <button onClick={() => setShowCodeLogin(false)} className="text-[#333]/40 hover:text-[#333]">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                    placeholder="ABCDEF"
                    className="flex-1 bg-[#f0f0f0] border-2 border-[#333] rounded-lg px-2 py-1 text-center font-mono font-bold uppercase"
                    maxLength={6}
                  />
                  <button 
                    onClick={handleCodeLogin}
                    disabled={isLoggingIn || loginCode.length < 6}
                    className="bg-[#baffc9] border-2 border-[#333] rounded-lg px-3 py-1 font-bold shadow-[0_2px_0_#333] active:shadow-none active:translate-y-[2px] disabled:opacity-50"
                  >
                    כניסה
                  </button>
                </div>
                {loginError && <span className="text-[10px] text-red-500 font-bold text-center">{loginError}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            {showSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-sm font-bold mb-3 shadow-sm animate-bounce">
                התחברות הצליחה!
              </div>
            )}
            <span className="text-[10px] text-[#333]/40">
              {user ? (user.isAnonymous ? "מחובר כילד (אורח)" : `מחובר כ: ${user.email}`) : "מחובר עם קוד משפחה"}
            </span>
            <div className="flex gap-3 mt-2">
              {(profile?.role === 'parent' || (!profile && user)) && (
                <button 
                  onClick={() => {
                    safeVibrate(5);
                    sounds.playSelect();
                    setShowFamilySettings(true);
                  }}
                  className="px-4 py-2 bg-[#baffc9] text-[#333] font-bold rounded-full border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] active:shadow-[0_0_0_1px_#333,0_0px_0_0_#333] active:translate-y-[4px] transition-all duration-75 text-sm"
                >
                  הגדרות משפחה
                </button>
              )}
              <button 
                onClick={() => {
                  safeVibrate(5);
                  sounds.playReset();
                  if (user) {
                    handleLogout();
                  } else {
                    localStorage.removeItem('guest_family_id');
                    localStorage.setItem('guest_role', '');
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-[#ffb3ba] text-[#333] font-bold rounded-full border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] active:shadow-[0_0_0_1px_#333,0_0px_0_0_0_#333] active:translate-y-[4px] transition-all duration-75 text-sm"
              >
                התנתק
              </button>
            </div>
          </div>
        )}
      </div>
      {showFamilySettings && <FamilySettingsModal onClose={closeFamilySettings} />}
    </div>
  );
}
