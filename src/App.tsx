/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import GameScreen from './components/GameScreen';
import InstallPrompt from './components/InstallPrompt';
import { KidId } from './types';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { KIDS } from './constants';
import { UserProvider, useUser } from './contexts/UserContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const [screen, setScreen] = useState<'splash' | 'home' | 'game'>('splash');
  const [selectedKid, setSelectedKid] = useState<KidId | null>(null);
  const { user, profile, authReady } = useUser();

  useEffect(() => {
    console.log("App state changed:", { screen, selectedKid, authReady, user: user?.uid, profile });
  }, [screen, selectedKid, authReady, user, profile]);

  // Safety timer: If we're still on splash after 6 seconds, force home
  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        console.log("Safety timer triggered: forcing home screen");
        setScreen('home');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  useEffect(() => {
    const checkDailyReset = async () => {
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem('appDate');
      
      if (savedDate !== today) {
        // Reset local storage
        localStorage.removeItem('tasks_yuvali');
        localStorage.removeItem('tasks_maayani');
        localStorage.removeItem('tasks_palgi');
        localStorage.setItem('appDate', today);

        // Reset Firestore if logged in
        if (user && profile) {
          try {
            for (const kidId of Object.keys(KIDS)) {
              const docRef = doc(db, 'users', profile.familyId, 'kids', kidId);
              const snapshot = await getDoc(docRef);
              if (snapshot.exists()) {
                await setDoc(docRef, { completedTasks: [] }, { merge: true });
              }
            }
          } catch (error) {
            console.error('Error resetting daily tasks in Firestore:', error);
          }
        }
      }
    };
    
    if (authReady) {
      checkDailyReset();
    }
  }, [user, authReady]);

  const handleSplashFinish = useCallback(() => {
    console.log("Splash finished, moving to home");
    setScreen('home');
  }, []);

  const handleKidSelect = useCallback((kidId: KidId) => {
    console.log("handleKidSelect called with:", kidId);
    setSelectedKid(kidId);
    setScreen('game');
  }, []);

  const handleBack = useCallback(() => {
    console.log("handleBack called");
    setScreen('home');
  }, []);

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (screen === 'splash') {
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#c0e2eb');
    } else {
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#C5E9F1');
    }
  }, [screen]);

  const backgroundStyle = screen === 'splash' 
    ? { backgroundColor: '#f7efc8' }
    : { background: 'linear-gradient(to bottom, #C5E9F1 0%, #FDC4C1 50%, #FFFDE1 100%)' };

  return (
    <div 
      dir="rtl" 
      className="w-full h-full min-h-[100dvh] max-w-md mx-auto relative overflow-hidden flex flex-col font-sans select-none transition-all duration-500"
      style={backgroundStyle}
    >
      {screen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
      {screen === 'home' && !authReady && (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-10 h-10 border-4 border-[#333] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-[#333]">טוען...</span>
        </div>
      )}
      {screen === 'home' && authReady && <HomeScreen onSelectKid={handleKidSelect} hasMagicBg={false} />}
      {screen === 'game' && selectedKid && authReady && (
        <GameScreen kidId={selectedKid} onBack={handleBack} />
      )}
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ErrorBoundary>
  );
}
