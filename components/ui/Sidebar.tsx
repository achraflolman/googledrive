
import React from 'react';
import { Book, CalendarDays, Settings, X, BrainCircuit, Camera, FileText, Bell, Flame, LifeBuoy } from 'lucide-react';
import type { AppUser } from '../../types';

interface SidebarProps {
  user: AppUser | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
  t: (key: string, replacements?: any) => string;
  getThemeClasses: (variant: string) => string;
  setCurrentView: (view: string) => void;
  currentView: string;
  currentSubject: string | null;
  setIsProfilePicModalOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, isSidebarOpen, setIsSidebarOpen, sidebarRef, t, getThemeClasses, setCurrentView, currentView, currentSubject, setIsProfilePicModalOpen }) => {
  const navItems = [
    { id: 'calendar', label: t('calendar'), icon: <CalendarDays className="w-5 h-5 mr-3" />, view: 'calendar' },
    { id: 'tools', label: t('extra_tools'), icon: <BrainCircuit className="w-5 h-5 mr-3" />, view: 'tools' },
    { id: 'settings', label: t('settings'), icon: <Settings className="w-5 h-5 mr-3" />, view: 'settings' },
  ];
  
  const bottomNavItems = [
    { id: 'feedback', label: t('feedback_support'), icon: <LifeBuoy className="w-5 h-5 mr-3" />, view: 'feedback' },
  ];

  const handleNavClick = (view: string) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const isHomeActive = currentView === 'home';
  const userFirstName = user?.userName?.split(' ')[0] || t('guest_fallback_name');

  return (
    <>
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out p-4 flex flex-col overflow-y-auto sidebar-scroll ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <style>{`
            .sidebar-scroll::-webkit-scrollbar { display: none; }
            .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className={`absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors duration-200`}
        >
          <X className="w-6 h-6" />
        </button>

        {user && (
          <div className="flex flex-col items-center mb-6 mt-8 text-center">
            <button onClick={() => setIsProfilePicModalOpen(true)} className="relative group">
              <img src={user.profilePictureUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover transition-all duration-300 group-hover:brightness-75" />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-all duration-300">
                <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </button>
            <p className={`mt-4 text-xl font-bold ${getThemeClasses('text-strong')}`}>{t('welcome_message', { name: userFirstName })}</p>
            {user.streakCount && user.streakCount > 0 && (
                <div className="flex items-center gap-1.5 mt-1 bg-orange-100 text-orange-600 font-bold text-sm py-1 px-3 rounded-full">
                    <Flame className="w-4 h-4" />
                    <span>{t('streak_days', {count: user.streakCount})}</span>
                </div>
            )}
            <p className="text-sm text-gray-600 mt-1">{user.className} {user.educationLevel?.toUpperCase()}</p>
            <p className="text-xs text-gray-500 break-all w-full px-2">{user.email}</p>
          </div>
        )}

        <nav className="flex-1 space-y-2">
            <button
              key='home'
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full text-left py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center text-gray-700
                ${isHomeActive ? `${getThemeClasses('bg')} text-white shadow-md` : `hover:${getThemeClasses('bg-light')}`}`}
            >
              <Book className="w-5 h-5 mr-3" />
              {t('my_subjects')}
            </button>
            <button
              key='notes'
              type="button"
              onClick={() => handleNavClick('notes')}
              className={`w-full text-left py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center text-gray-700
                ${currentView === 'notes' ? `${getThemeClasses('bg')} text-white shadow-md` : `hover:${getThemeClasses('bg-light')}`}`}
            >
              <FileText className="w-5 h-5 mr-3" />
              {t('notes')}
            </button>
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.view)}
              className={`w-full text-left py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center text-gray-700
                ${currentView === item.view ? `${getThemeClasses('bg')} text-white shadow-md` : `hover:${getThemeClasses('bg-light')}`}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto pt-4 border-t">
             {bottomNavItems.map(item => (
                <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.view)}
                className={`w-full text-left py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center text-gray-700
                    ${currentView === item.view ? `${getThemeClasses('bg')} text-white shadow-md` : `hover:${getThemeClasses('bg-light')}`}`}
                >
                {item.icon} {item.label}
                </button>
            ))}
             <div className="py-4 text-center text-xs text-gray-400">
                <p>Schoolmaps &copy; 2025</p>
             </div>
        </div>
      </div>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsSidebarOpen(false)}></div>
      )}
    </>
  );
};

export default Sidebar;
