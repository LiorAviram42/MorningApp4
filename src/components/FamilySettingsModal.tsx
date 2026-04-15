import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Copy, Check, Users, QrCode, Info } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { sounds, safeVibrate } from '../utils/sounds';

interface Props {
  onClose: () => void;
}

export default function FamilySettingsModal({ onClose }: Props) {
  const { user, profile } = useUser();
  const [joinCode, setJoinCode] = useState('');
  const [childJoinCode, setChildJoinCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedParent, setCopiedParent] = useState(false);
  const [copiedChild, setCopiedChild] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const [copiedUrl, setCopiedUrl] = useState(false);

  const appUrl = window.location.origin;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`;

  const copyUrl = () => {
    safeVibrate(5);
    sounds.playSelect();
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        damping: 20, 
        stiffness: 300,
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring" as const, damping: 20, stiffness: 300 }
    }
  };

  useEffect(() => {
    if (user && profile && profile.familyId === user.uid) {
      // Check if we already have join codes
      const fetchCodes = async () => {
        const q = query(collection(db, 'joinCodes'), where('familyId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if (doc.data().role === 'parent') setJoinCode(doc.id);
          if (doc.data().role === 'child') setChildJoinCode(doc.id);
        });
      };
      fetchCodes();
    }
  }, [user, profile]);

  const generateCode = async (role: 'parent' | 'child') => {
    if (!user) return;
    safeVibrate(5);
    sounds.playSelect();
    setLoading(true);
    try {
      // Delete existing code for this role if any
      const q = query(collection(db, 'joinCodes'), where('familyId', '==', user.uid), where('role', '==', role));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      // Generate new 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(doc(db, 'joinCodes', code), {
        familyId: user.uid,
        role: role
      });
      
      if (role === 'parent') setJoinCode(code);
      else setChildJoinCode(code);
    } catch (err) {
      console.error(err);
      setError('שגיאה ביצירת קוד');
    }
    setLoading(false);
  };

  const joinFamily = async () => {
    if (!inputCode) return;
    
    safeVibrate(5);
    sounds.playSelect();

    if (!user) {
      setError('יש להתחבר קודם עם גוגל כדי להצטרף למשפחה');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const codeDoc = await getDoc(doc(db, 'joinCodes', inputCode.toUpperCase()));
      if (codeDoc.exists()) {
        const data = codeDoc.data();
        await setDoc(doc(db, 'users', user.uid), {
          familyId: data.familyId,
          role: data.role
        }, { merge: true });
        onClose();
      } else {
        setError('קוד לא חוקי');
      }
    } catch (err) {
      console.error(err);
      setError('שגיאה בהצטרפות למשפחה');
    }
    setLoading(false);
  };

  const leaveFamily = async () => {
    safeVibrate(5);
    sounds.playReset();
    setLoading(true);

    if (!user) {
      localStorage.removeItem('guest_family_id');
      localStorage.removeItem('guest_role');
      window.location.reload();
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid), {
        familyId: user.uid,
        role: 'parent'
      }, { merge: true });
      onClose();
    } catch (err) {
      console.error(err);
      setError('שגיאה בעזיבת המשפחה');
    }
    setLoading(false);
  };

  const copyToClipboard = (code: string, role: 'parent' | 'child') => {
    safeVibrate(5);
    sounds.playSelect();
    navigator.clipboard.writeText(code);
    if (role === 'parent') {
      setCopiedParent(true);
      setTimeout(() => setCopiedParent(false), 3000);
    } else {
      setCopiedChild(true);
      setTimeout(() => setCopiedChild(false), 3000);
    }
  };

  const isOwner = user && profile ? profile.familyId === user.uid : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-[#fcf9f2] rounded-3xl p-6 w-full max-w-sm border-[3px] border-white shadow-[0_0_0_1px_#333,0_8px_0_0_#333] relative"
      >
        <motion.div variants={itemVariants} className="relative flex items-center justify-center mb-6 h-10">
          <motion.button 
            onClick={() => {
              safeVibrate(5);
              sounds.playSelect();
              onClose();
            }}
            whileTap={{ y: 4, boxShadow: "0px 0px 0px 1px #333, 0px 0px 0px 0px #333" }}
            className="absolute left-0 p-2 text-[#333] bg-[#ffb3ba] rounded-full border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333]"
          >
            <X size={20} />
          </motion.button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-[#333]">הגדרות משפחה</h2>
            <div className="absolute right-0 w-10 h-10 bg-[#bae1ff] rounded-full flex items-center justify-center text-[#333] border-2 border-white">
              <Users size={24} />
            </div>
          </div>
        </motion.div>

        {!profile ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-8 h-8 border-4 border-[#333] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#333] font-bold text-center">טוען נתוני משפחה...</p>
            <p className="text-xs text-[#333]/60 text-center px-4">אם זה לוקח זמן רב, ייתכן שיש בעיית חיבור לאינטרנט.</p>
          </div>
        ) : (
          <div className="space-y-6">
          {isOwner ? (
            <>
              <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333]">
                <h3 className="font-bold text-[#333] mb-2">הזמנת הורה נוסף</h3>
                <p className="text-sm text-[#333]/70 mb-4">
                  להורה יש הרשאות מלאות, כולל איפוס כוכבים.
                </p>
                
                {joinCode ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 bg-[#ffffba] rounded-xl p-3 text-center font-mono text-xl font-bold tracking-widest text-[#333] border-2 border-white shadow-[0_0_0_1px_#333,0_2px_0_0_#333]">
                      {joinCode}
                    </div>
                    <motion.button 
                      onPointerDown={() => copyToClipboard(joinCode, 'parent')}
                      animate={{ 
                        borderRadius: copiedParent ? "12px" : "24px",
                        y: copiedParent ? 4 : 0,
                        boxShadow: copiedParent 
                          ? "0px 0px 0px 1px #333, 0px 0px 0px 0px #333" 
                          : "0px 0px 0px 1px #333, 0px 4px 0px 0px #333"
                      }}
                      transition={copiedParent ? { type: "tween" as const, duration: 0.05 } : { type: "spring" as const, stiffness: 500, damping: 15 }}
                      className="p-3 bg-[#baffc9] text-[#333] border-2 border-white"
                    >
                      {copiedParent ? <Check size={20} /> : <Copy size={20} />}
                    </motion.button>
                  </div>
                ) : (
                  <button 
                    onClick={() => generateCode('parent')}
                    disabled={loading}
                    className="w-full py-2 bg-[#bae1ff] text-[#333] rounded-xl font-bold border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] active:shadow-[0_0_0_1px_#333,0_0px_0_0_#333] active:translate-y-[4px] transition-all duration-75 disabled:opacity-50"
                  >
                    צור קוד הורה
                  </button>
                )}
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333]">
                <h3 className="font-bold text-[#333] mb-2">הזמנת ילד</h3>
                <p className="text-sm text-[#333]/70 mb-4">
                  לילד אין הרשאה לאפס כוכבים.
                </p>
                
                {childJoinCode ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 bg-[#ffffba] rounded-xl p-3 text-center font-mono text-xl font-bold tracking-widest text-[#333] border-2 border-white shadow-[0_0_0_1px_#333,0_2px_0_0_#333]">
                      {childJoinCode}
                    </div>
                    <motion.button 
                      onPointerDown={() => copyToClipboard(childJoinCode, 'child')}
                      animate={{ 
                        borderRadius: copiedChild ? "12px" : "24px",
                        y: copiedChild ? 4 : 0,
                        boxShadow: copiedChild 
                          ? "0px 0px 0px 1px #333, 0px 0px 0px 0px #333" 
                          : "0px 0px 0px 1px #333, 0px 4px 0px 0px #333"
                      }}
                      transition={copiedChild ? { type: "tween" as const, duration: 0.05 } : { type: "spring" as const, stiffness: 500, damping: 15 }}
                      className="p-3 bg-[#baffc9] text-[#333] border-2 border-white"
                    >
                      {copiedChild ? <Check size={20} /> : <Copy size={20} />}
                    </motion.button>
                  </div>
                ) : (
                  <button 
                    onClick={() => generateCode('child')}
                    disabled={loading}
                    className="w-full py-2 bg-[#baffc9] text-[#333] rounded-xl font-bold border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] active:shadow-[0_0_0_1px_#333,0_0px_0_0_#333] active:translate-y-[4px] transition-all duration-75 disabled:opacity-50"
                  >
                    צור קוד ילד
                  </button>
                )}
              </motion.div>
            </>
          ) : (
            <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] text-center">
              <p className="text-[#333] font-bold mb-2">אתה מחובר למשפחה של מישהו אחר.</p>
              <p className="text-xs text-[#333]/60">רק מנהל המשפחה יכול לייצר קודי הזמנה.</p>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333]">
            <h3 className="font-bold text-[#333] mb-2">
              {isOwner ? "הצטרפות למשפחה אחרת" : "הצטרפות למשפחה"}
            </h3>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="הזן קוד..."
                className="min-w-0 flex-1 bg-white rounded-xl px-3 py-2 text-center font-mono uppercase focus:outline-none border-2 border-white shadow-[0_0_0_1px_#333,0_2px_0_0_#333] focus:shadow-[0_0_0_1px_#333,0_4px_0_0_#333] focus:-translate-y-[2px] transition-all duration-75 text-[#333]"
                maxLength={6}
              />
              <button 
                onClick={joinFamily}
                disabled={loading || inputCode.length < 6}
                className="shrink-0 px-6 bg-[#ffdfba] text-[#333] rounded-xl font-bold border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] active:shadow-[0_0_0_1px_#333,0_0px_0_0_#333] active:translate-y-[4px] transition-all duration-75 disabled:opacity-50"
              >
                הצטרף
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
          </motion.div>

          {!isOwner && (
            <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] text-center">
              <h3 className="font-bold text-[#333] mb-2">אתם חלק ממשפחה!</h3>
              <p className="text-sm text-[#333]/70 mb-4">
                אתם מחוברים למשפחה. הנתונים שלכם מסונכרנים.
              </p>
              <button 
                onClick={leaveFamily}
                disabled={loading}
                className="w-full py-3 bg-[#ffb3ba] text-[#333] rounded-xl font-bold border-2 border-white shadow-[0_0_0_1px_#333,0_4px_0_0_#333] active:shadow-[0_0_0_1px_#333,0_0px_0_0_#333] active:translate-y-[4px] transition-all duration-75 disabled:opacity-50"
              >
                עזוב משפחה
              </button>
            </motion.div>
          )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
