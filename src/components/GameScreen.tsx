import React, { useState, useEffect } from 'react';
import { KidId, Task } from '../types';
import { KIDS, getTasksForKid } from '../constants';
import { motion, useAnimation } from 'motion/react';
import { sounds, safeVibrate } from '../utils/sounds';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Home, Plus, Minus } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

import charYuvaliBefore from '/character_yuvali_before.png';
import charYuvaliAfter from '/character_yuvali_after.png';
import charMaayaniBefore from '/character_maayani_before.png';
import charMaayaniAfter from '/character_maayani_after.png';
import charPalgiBefore from '/character_palgi_before.png';
import charPalgiAfter from '/character_palgi_after.png';

const CHARACTERS: Record<string, { before: string, after: string }> = {
  yuvali: { before: charYuvaliBefore, after: charYuvaliAfter },
  maayani: { before: charMaayaniBefore, after: charMaayaniAfter },
  palgi: { before: charPalgiBefore, after: charPalgiAfter }
};

interface Props {
  kidId: KidId;
  onBack: () => void;
}

export default function GameScreen({ kidId, onBack }: Props) {
  const { user, profile } = useUser();
  const kid = KIDS[kidId];
  const tasks = getTasksForKid(kidId);
  const leftTasks = tasks.filter(t => t.side === 'left');
  const rightTasks = tasks.filter(t => t.side === 'right');

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);
  const [stars, setStars] = useState(0);
  const [lastStarDate, setLastStarDate] = useState('');
  const [lastActiveDate, setLastActiveDate] = useState('');

  useEffect(() => {
    if (!user || !profile) {
      const saved = localStorage.getItem(`tasks_${kidId}`);
      if (saved) {
        setCompletedTasks(new Set(JSON.parse(saved)));
      }
      
      const savedStars = localStorage.getItem(`stars_${kidId}`);
      if (savedStars) {
        setStars(parseInt(savedStars, 10));
      }

      const savedDate = localStorage.getItem(`lastStarDate_${kidId}`);
      if (savedDate) {
        setLastStarDate(savedDate);
      }
      return;
    }

    // Load from Firestore
    const docRef = doc(db, 'users', profile.familyId, 'kids', kidId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const today = new Date().toDateString();
        
        // Daily reset logic for Firestore
        if (data.lastActiveDate && data.lastActiveDate !== today) {
          setCompletedTasks(new Set());
          setStars(data.stars || 0);
          setLastStarDate(data.lastStarDate || '');
          setLastActiveDate(today);
          // Update Firestore to clear tasks for the new day
          setDoc(docRef, { completedTasks: [], lastActiveDate: today }, { merge: true });
        } else {
          setCompletedTasks(new Set(data.completedTasks || []));
          setStars(data.stars || 0);
          setLastStarDate(data.lastStarDate || '');
          setLastActiveDate(data.lastActiveDate || today);
          
          if (!data.lastActiveDate) {
            setDoc(docRef, { lastActiveDate: today }, { merge: true });
          }
        }
      } else {
        setCompletedTasks(new Set());
        setStars(0);
        setLastStarDate('');
        setLastActiveDate(new Date().toDateString());
      }
    }, (error) => {
      console.error('Firestore Error: ', error);
    });

    return () => unsubscribe();
  }, [kidId, user, profile]);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 350);
    return () => clearTimeout(timer);
  }, [kidId]);

  const saveToFirestore = async (newCompletedTasks: string[], newStars: number, newLastStarDate: string) => {
    if (!user || !profile) return;
    try {
      const docRef = doc(db, 'users', profile.familyId, 'kids', kidId);
      await setDoc(docRef, {
        completedTasks: newCompletedTasks,
        stars: newStars,
        lastStarDate: newLastStarDate,
        lastActiveDate: new Date().toDateString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    }
  };

  const toggleTask = (taskId: string) => {
    safeVibrate(5);

    sounds.playClick();

    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      let newStars = stars;
      let newLastStarDate = lastStarDate;

      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
        if (newSet.size === tasks.length) {
          sounds.playSuccess();
          
          // Award star if not already awarded today
          const today = new Date().toDateString();
          
          if (newLastStarDate !== today) {
            newStars = stars + 1;
            newLastStarDate = today;
            
            if (!user) {
              setStars(newStars);
              setLastStarDate(newLastStarDate);
              localStorage.setItem(`stars_${kidId}`, newStars.toString());
              localStorage.setItem(`lastStarDate_${kidId}`, newLastStarDate);
            }
          }
        }
      }
      
      const newCompletedTasksArray = Array.from(newSet) as string[];
      
      if (!user) {
        localStorage.setItem(`tasks_${kidId}`, JSON.stringify(newCompletedTasksArray));
      } else {
        saveToFirestore(newCompletedTasksArray, newStars, newLastStarDate);
      }
      return newSet;
    });
  };

  const progressPct = tasks.length > 0 ? (completedTasks.size / tasks.length) * 100 : 0;
  const isAllCompleted = completedTasks.size === tasks.length && tasks.length > 0;

  const updateStars = async (delta: number) => {
    safeVibrate(5);
    sounds.playClick();
    const newCount = Math.max(0, stars + delta);
    
    if (!user || !profile) {
      localStorage.setItem(`stars_${kidId}`, newCount.toString());
      setStars(newCount);
      return;
    }

    try {
      const docRef = doc(db, 'users', profile.familyId, 'kids', kidId);
      await setDoc(docRef, { stars: newCount }, { merge: true });
    } catch (error) {
      console.error('Error updating stars:', error);
    }
  };

  const characterImg = isAllCompleted ? CHARACTERS[kidId].after : CHARACTERS[kidId].before;

  return (
    <div className="flex flex-col h-full w-full p-[15px] box-border relative overflow-hidden safe-area-inset">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <motion.div 
        initial={{ y: 15, boxShadow: "0px 0px 0px #333" }}
        animate={{ y: 0, boxShadow: "0px 8px 0px #333" }}
        transition={{ type: "spring" as const, stiffness: 500, damping: 10 }}
        className="flex flex-col h-full w-full bg-white/75 backdrop-blur-sm rounded-3xl border border-[#333] p-2.5 box-border relative overflow-hidden z-10"
      >
        <div className="flex flex-row justify-between items-center w-full pt-2 pb-4 border-b border-[#333]/10 shrink-0">
          <h3 className="m-0 text-lg font-bold text-[#333] text-right min-w-[100px]">ההתארגנות של {kid.name}</h3>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1 bg-black/5 backdrop-blur-[2px] px-3 py-1 rounded-full border border-black/5 min-h-[32px]">
              {stars > 0 ? (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
                    <svg key={i} viewBox="0 0 24 24" className="w-5 h-5">
                      <path 
                        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                        fill="#ffbc00"
                        stroke="#000"
                        strokeWidth="1.2"
                      />
                    </svg>
                  ))}
                  {stars > 5 && <span className="text-xs font-black text-[#333] ml-0.5">+{stars - 5}</span>}
                </div>
              ) : (
                <span className="text-[10px] font-bold text-[#333]/30">אין כוכבים עדיין</span>
              )}
            </div>
          </div>

          <motion.button 
            initial={{ y: 4, boxShadow: "0px 0px 0px #333" }}
            animate={isReady ? { y: 0, boxShadow: "0px 4px 0px #333" } : { y: 4, boxShadow: "0px 0px 0px #333" }}
            whileTap={{ y: 4, boxShadow: "0px 0px 0px #333" }}
            transition={{ type: "spring" as const, stiffness: 800, damping: 15 }}
            className="bg-[#fde4cf] text-[#333] border border-[#333] p-2 rounded-2xl cursor-pointer flex items-center justify-center min-w-[40px]"
            onClick={() => {
              safeVibrate(5);
              sounds.playBack();
              onBack();
            }}
          >
            <Home size={24} stroke="#333" fill="#f9b88a" strokeWidth={1.5} />
          </motion.button>
        </div>

        <div className="flex-1 flex flex-col w-full my-0 min-h-0">
          <div className="flex justify-between items-center w-full flex-1 relative min-h-0">
            {/* Right Tasks */}
            <div className="flex flex-col justify-evenly h-full flex-[0_0_80px] z-10 py-0.5">
              {rightTasks.map((t) => (
                <TaskButton 
                  key={t.id} 
                  task={t} 
                  isCompleted={completedTasks.has(t.id)} 
                  isReady={isReady}
                  onClick={() => toggleTask(t.id)} 
                />
              ))}
            </div>

            {/* Character */}
            <div className="flex-1 h-full flex flex-col justify-center items-center absolute top-0 left-0 w-full z-0 pointer-events-none">
              <img 
                src={characterImg} 
                alt="Character" 
                className="max-w-[75%] max-h-[75%] object-contain transition-opacity duration-300"
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${kid.name}${isAllCompleted ? 'happy' : 'sleepy'}`;
                }}
              />
            </div>

            {/* Left Tasks */}
            <div className="flex flex-col justify-evenly h-full flex-[0_0_80px] z-10 py-0.5">
              {leftTasks.map((t) => (
                <TaskButton 
                  key={t.id} 
                  task={t} 
                  isCompleted={completedTasks.has(t.id)} 
                  isReady={isReady}
                  onClick={() => toggleTask(t.id)} 
                />
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div 
            className="w-full h-[64px] bg-white rounded-full shrink-0 relative box-border border-2 border-[#333] p-1.5 mt-[-4px]"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-white">
              <div 
                className="h-full rounded-full transition-all duration-600 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
                style={{ 
                  width: `${progressPct}%`, 
                  backgroundImage: kid.gradient 
                }}
              />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex flex-col items-center shrink-0 mt-4 mb-1 relative">
          <div className="flex items-center gap-4">
            {profile?.role === 'parent' && (
              <button 
                onClick={() => updateStars(-1)}
                className="w-8 h-8 rounded-full bg-white border border-[#333] flex items-center justify-center shadow-[0_3px_0_#333] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <Minus size={18} />
              </button>
            )}

            <motion.button 
              initial={{ y: 4, boxShadow: "0px 0px 0px #333" }}
              animate={
                completedTasks.size > 0 
                  ? { y: 0, boxShadow: "0px 4px 0px #333" }
                  : { y: 4, boxShadow: "0px 0px 0px #333" }
              }
              whileTap={completedTasks.size > 0 ? { y: 4, boxShadow: "0px 0px 0px #333" } : {}}
              transition={{ type: "spring" as const, stiffness: 800, damping: 15 }}
              className={`py-2 px-6 rounded-2xl font-bold text-sm border ${
                completedTasks.size > 0 
                  ? 'bg-[#bae1ff] text-[#333] border-[#333] cursor-pointer' 
                  : 'bg-[#fcf9f2] text-[#333]/40 border-[#333]/40 cursor-default'
              }`}
              onClick={() => {
                if (completedTasks.size === 0) return;
                safeVibrate(5);
                sounds.playReset();
                if (!user) {
                  setCompletedTasks(new Set());
                  localStorage.removeItem(`tasks_${kidId}`);
                } else {
                  saveToFirestore([], stars, lastStarDate);
                }
              }}
            >
              {kidId === 'yuvali' ? 'התחילי מחדש' : 'התחל מחדש'}
            </motion.button>

            {profile?.role === 'parent' && (
              <button 
                onClick={() => updateStars(1)}
                className="w-8 h-8 rounded-full bg-white border border-[#333] flex items-center justify-center shadow-[0_3px_0_#333] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          
          <div className="h-[20px] mt-3 flex items-center justify-center">
            {stars > 0 && (!profile || profile.role === 'parent') && (
              <button 
                className="text-[10px] text-[#333]/30 underline bg-transparent border-none cursor-pointer p-0.5"
                onClick={() => {
                  safeVibrate(5);
                  if (!user) {
                    setStars(0);
                    setLastStarDate('');
                    localStorage.removeItem(`stars_${kidId}`);
                    localStorage.removeItem(`lastStarDate_${kidId}`);
                  } else {
                    saveToFirestore(Array.from(completedTasks) as string[], 0, '');
                  }
                }}
              >
                איפוס כוכבים
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface TaskButtonProps {
  task: Task;
  isCompleted: boolean;
  isReady: boolean;
  onClick: () => void;
  key?: string;
}

function TaskButton({ task, isCompleted, isReady, onClick }: TaskButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (isReady) {
      controls.start({ y: 0, boxShadow: "0px 4px 0px #333" });
    } else {
      controls.start({ y: 4, boxShadow: "0px 0px 0px #333" });
    }
  }, [isReady, controls]);

  const handlePointerDown = () => {
    setIsPressed(true);
    controls.start({ 
      y: 4, 
      boxShadow: "0px 0px 0px #333",
      transition: { type: "spring" as const, stiffness: 1000, damping: 20 }
    });
  };

  const handlePointerUp = () => {
    if (!isPressed) return;
    setIsPressed(false);
    
    // The "pop back up" delay requested by user (1-2ms is negligible, but we can make the spring slower)
    controls.start({ 
      y: 0, 
      boxShadow: "0px 4px 0px #333",
      transition: { 
        type: "spring" as const, 
        stiffness: 400, // Lower stiffness = slower return
        damping: 20,
        delay: 0.002 // 2ms delay as requested
      }
    });
    
    onClick();
  };

  return (
    <div className="flex flex-col items-center justify-center w-[85px]">
      <motion.button 
        animate={controls}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setIsPressed(false);
          controls.start({ y: 0, boxShadow: "0px 4px 0px #333" });
        }}
        className={`w-[75px] h-[75px] rounded-full border border-[#333] ${isCompleted ? 'bg-white' : 'bg-[#fcf9f2]'} flex items-center justify-center p-0.5 touch-none`}
      >
        <img 
          src={isCompleted ? task.iconOn : task.iconOff} 
          alt={task.title} 
          className="w-full h-full object-contain pointer-events-none transition-all duration-300"
          style={!isCompleted ? { filter: 'grayscale(100%) sepia(20%) hue-rotate(350deg) brightness(115%) contrast(120%) opacity(0.7)' } : {}}
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${task.title}&background=random&color=fff&rounded=true&size=128`;
          }}
        />
      </motion.button>
      <span className="block text-[12px] font-bold text-[#333] mt-1 text-center leading-tight whitespace-pre-line px-1 h-[28px] flex items-center justify-center">
        {task.title}
      </span>
    </div>
  );
}
