import React, { useState, useEffect } from 'react';
import { CreatorProfile, DemoView } from './types';
import { getStoredDemoProfile, saveStoredDemoProfile, resetDemoProfile } from './utils/storage';
import { DeviceFrame } from './components/DeviceFrame';
import { AdminDemoPanel } from './components/AdminDemoPanel';
import { MiniAppSimulator } from './components/MiniAppSimulator';
import { ChannelSimulator } from './components/ChannelSimulator';
import { BotSimulator } from './components/BotSimulator';

export default function App() {
  const [profile, setProfile] = useState<CreatorProfile>(() => getStoredDemoProfile());
  const [currentView, setCurrentView] = useState<DemoView>('admin');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  useEffect(() => {
    const handleUpdated = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      }
    };
    window.addEventListener('tu_vip_demo_updated', handleUpdated);
    return () => window.removeEventListener('tu_vip_demo_updated', handleUpdated);
  }, []);

  const handleUpdateProfile = (updated: CreatorProfile) => {
    setProfile(updated);
    saveStoredDemoProfile(updated);
  };

  const handleResetDefault = () => {
    if (window.confirm('¿Deseas restablecer los datos y los 16 contenidos iniciales predeterminados?')) {
      const def = resetDemoProfile();
      setProfile(def);
    }
  };

  return (
    <DeviceFrame
      currentView={currentView}
      onViewChange={setCurrentView}
      isPhoneFrame={isPhoneFrame}
      onTogglePhoneFrame={() => setIsPhoneFrame(prev => !prev)}
    >
      {currentView === 'admin' && (
        <AdminDemoPanel
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onResetDefault={handleResetDefault}
          onNavigateToView={setCurrentView}
        />
      )}

      {currentView === 'miniapp' && (
        <MiniAppSimulator
          profile={profile}
          onOpenAdmin={() => setCurrentView('admin')}
        />
      )}

      {currentView === 'channel' && (
        <ChannelSimulator
          profile={profile}
          onNavigateToView={setCurrentView}
        />
      )}

      {currentView === 'bot' && (
        <BotSimulator
          profile={profile}
          onNavigateToView={setCurrentView}
        />
      )}
    </DeviceFrame>
  );
}

