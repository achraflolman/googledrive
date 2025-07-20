import React, { useState, useEffect, useMemo } from 'react';
import type { AppUser, ModalContent } from '../../types';
import { auth, getGoogleAuthUrl, storeGoogleTokens, disconnectGoogleDrive, sendPasswordResetEmail } from '../../services/firebase';
import { allSubjects, availableThemeColors, educationLevels, availableFonts } from '../../constants';
import { User, Palette, Info, HelpCircle, Shield, GripVertical, Plus, Bell, Type, AlertTriangle, LifeBuoy, Trash2, Link, Unlink } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SettingsViewProps {
  user: AppUser;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  getThemeClasses: (variant: string) => string;
  language: 'nl' | 'en';
  setLanguage: (lang: 'nl' | 'en') => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  showAppModal: (content: ModalContent) => void;
  tSubject: (key: string) => string;
  setCurrentView: (view: string) => void;
  onProfileUpdate: (updatedData: Partial<AppUser>) => Promise<void>;
  onDeleteAccountRequest: () => void;
  onCleanupAccountRequest: () => void;
}

const SortableItem = React.memo(({ id, t }: { id: string, t: any }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 0.2s ease',
        zIndex: isDragging ? 10 : 'auto',
    };

    const widgetNames: { [key: string]: string } = {
        subjects: t('widget_subjects'),
        agenda: t('widget_agenda'),
        files: t('widget_files'),
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`p-3 bg-white rounded-lg shadow-sm flex items-center justify-between touch-none`}>
            <span className="font-semibold">{widgetNames[id] || id}</span>
            <GripVertical className="text-gray-400 cursor-grab" />
        </div>
    );
});


const SettingsView: React.FC<SettingsViewProps> = ({ user, t, getThemeClasses, language, setLanguage, themeColor, setThemeColor, fontFamily, setFontFamily, showAppModal, tSubject, setCurrentView, onProfileUpdate, onDeleteAccountRequest, onCleanupAccountRequest }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [formData, setFormData] = useState({
      userName: user.userName || '',
      schoolName: user.schoolName || '',
      className: user.className || '',
      educationLevel: user.educationLevel || '',
  });

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(user.selectedSubjects || []);
  const [homeLayout, setHomeLayout] = useState<string[]>(user.homeLayout || ['subjects', 'agenda', 'files']);
  const [customSubjects, setCustomSubjects] = useState<string[]>(user.customSubjects || []);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user.notificationsEnabled ?? true);


  useEffect(() => {
    setFormData({
      userName: user.userName || '',
      schoolName: user.schoolName || '',
      className: user.className || '',
      educationLevel: user.educationLevel || '',
    });
    setSelectedSubjects(user.selectedSubjects || []);
    setHomeLayout(user.homeLayout || ['subjects', 'agenda', 'files']);
    setCustomSubjects(user.customSubjects || []);
    setNotificationsEnabled(user.notificationsEnabled ?? true);
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const allDisplaySubjects = useMemo(() => [...allSubjects, ...customSubjects], [customSubjects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const handleConnectGoogleDrive = async () => {
    setIsConnecting(true);
    try {
        const result = await getGoogleAuthUrl();
        const { url } = result.data as { url: string };

        const authWindow = window.open(url, '_blank', 'width=500,height=600');

        const messageListener = async (event: MessageEvent) => {
            if (event.source !== authWindow) return;
            if (event.data.type === 'google-oauth-code') {
                window.removeEventListener('message', messageListener);
                authWindow?.close();
                try {
                    await storeGoogleTokens({ code: event.data.code });
                    showAppModal({ text: 'Google Drive gekoppeld!' });
                } catch (error) {
                    showAppModal({ text: 'Kon Google Drive niet koppelen.' });
                    console.error(error);
                } finally {
                    setIsConnecting(false);
                }
            }
        };

        window.addEventListener('message', messageListener);
    } catch (error) {
        showAppModal({ text: 'Kon autorisatie-URL niet ophalen.' });
        console.error(error);
        setIsConnecting(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    showAppModal({
        text: 'Weet je zeker dat je de koppeling met Google Drive wilt verbreken?',
        confirmAction: async () => {
            try {
                await disconnectGoogleDrive();
                showAppModal({ text: 'Google Drive is ontkoppeld.' });
            } catch (error) {
                showAppModal({ text: 'Ontkoppelen mislukt.' });
                console.error(error);
            }
        },
        cancelAction: () => {}
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = homeLayout.indexOf(String(active.id));
        const newIndex = homeLayout.indexOf(String(over.id));
        const newOrder = arrayMove(homeLayout, oldIndex, newIndex);
        setHomeLayout(newOrder); 
        onProfileUpdate({ homeLayout: newOrder });
    }
  };

  const colorClasses: {[key: string]: string} = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
    amber: 'bg-amber-500',
  };

  const handleProfileSave = () => {
    const originalSubjects = user.selectedSubjects || [];
    const subjectsToRemove = originalSubjects.filter(s => !selectedSubjects.includes(s));

    const performSave = async () => {
        setIsSaving(true);
        await onProfileUpdate({
            ...formData,
            selectedSubjects,
            customSubjects
        });
        showAppModal({ text: t('success_settings_saved') });
        setIsSaving(false);
    };

    if (subjectsToRemove.length > 0 && user.uid !== 'guest-user') {
        showAppModal({
            text: t('confirm_remove_subjects_warning'),
            confirmAction: performSave,
            cancelAction: () => {}
        });
    } else {
        performSave();
    }
  };

  const handlePasswordReset = async () => {
    const currentUser = auth.currentUser;
    if(!currentUser || user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed')});
        return;
    }
    try {
        await sendPasswordResetEmail(auth, currentUser.email!);
        showAppModal({text: t('password_reset_sent', {email: currentUser.email!})});
    } catch (error) {
        showAppModal({text: t('error_password_reset_failed')});
    }
  };
  
  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  };
  
  const handleThemeChange = (color: string) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
    onProfileUpdate({ themePreference: color });
  }

  const handleLangChange = (lang: 'nl' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('appLanguage', lang);
    onProfileUpdate({ languagePreference: lang });
  }
  
  const handleFontChange = (font: string) => {
    setFontFamily(font);
    localStorage.setItem('fontFamily', font);
    onProfileUpdate({ fontPreference: font });
  };
  
  const handleAddCustomSubject = () => {
    const newSubjectKey = customSubjectInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!newSubjectKey) {
        showAppModal({ text: t('error_subject_empty') });
        return;
    }
    if (allDisplaySubjects.includes(newSubjectKey)) {
        showAppModal({ text: t('error_subject_exists') });
        return;
    }
    const newCustomSubjects = [...customSubjects, newSubjectKey];
    setCustomSubjects(newCustomSubjects);
    setSelectedSubjects(prev => [...prev, newSubjectKey]);
    setCustomSubjectInput('');
    onProfileUpdate({ customSubjects: newCustomSubjects, selectedSubjects: [...selectedSubjects, newSubjectKey] });
  };
  
  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    onProfileUpdate({ notificationsEnabled: enabled });
  }

  const SettingSection = ({ title, children, icon, isDanger = false }: { title: string, children: React.ReactNode, icon: React.ReactNode, isDanger?: boolean }) => (
      <div className={`bg-white p-4 sm:p-6 rounded-lg shadow-md animate-fade-in ${isDanger ? 'border-2 border-orange-400' : ''}`}>
          <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDanger ? 'text-orange-600' : getThemeClasses('text')}`}>
              {icon}
              {title}
          </h3>
          <div className="space-y-4">
              {children}
          </div>
      </div>
  );

  return (
    <div className="space-y-6">
      <h2 className={`text-3xl font-bold text-center ${getThemeClasses('text-strong')}`}>{t('settings_title')}</h2>
      <div className="flex justify-center border-b flex-wrap">
        <button type="button" onClick={() => setActiveTab('account')} className={`py-2 px-4 font-semibold transition-colors duration-200 ${activeTab === 'account' ? getThemeClasses('text') + ' border-b-2 ' + getThemeClasses('border') : 'text-gray-500 hover:bg-gray-100 rounded-t-lg'}`}>{t('settings_account_section')}</button>
        <button type="button" onClick={() => setActiveTab('appearance')} className={`py-2 px-4 font-semibold transition-colors duration-200 ${activeTab === 'appearance' ? getThemeClasses('text') + ' border-b-2 ' + getThemeClasses('border') : 'text-gray-500 hover:bg-gray-100 rounded-t-lg'}`}>{t('settings_appearance_section')}</button>
        <button type="button" onClick={() => setActiveTab('privacy')} className={`py-2 px-4 font-semibold transition-colors duration-200 ${activeTab === 'privacy' ? getThemeClasses('text') + ' border-b-2 ' + getThemeClasses('border') : 'text-gray-500 hover:bg-gray-100 rounded-t-lg'}`}>{t('settings_privacy_section')}</button>
        <button type="button" onClick={() => setActiveTab('help')} className={`py-2 px-4 font-semibold transition-colors duration-200 ${activeTab === 'help' ? getThemeClasses('text') + ' border-b-2 ' + getThemeClasses('border') : 'text-gray-500 hover:bg-gray-100 rounded-t-lg'}`}>{t('settings_help_info_section')}</button>
      </div>
      
      {activeTab === 'account' && (
        <div className="space-y-6">
            <SettingSection title={t('profile_section')} icon={<User className={getThemeClasses('text')} />}>
                <input name="userName" value={formData.userName} onChange={handleInputChange} placeholder={t('your_name')} className="w-full p-2 border rounded-lg" />
                <input name="schoolName" value={formData.schoolName} onChange={handleInputChange} placeholder={t('school_name')} className="w-full p-2 border rounded-lg" />
                <input name="className" value={formData.className} onChange={handleInputChange} placeholder={t('class_name')} className="w-full p-2 border rounded-lg" />
                <select name="educationLevel" value={formData.educationLevel} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white">
                    <option value="">{t('select_level')}</option>
                    {educationLevels.map(level => <option key={level} value={level}>{tSubject(level)}</option>)}
                </select>
                
                <div className="pt-4 border-t">
                    <p className="font-semibold">{t('add_custom_subject')}</p>
                     <div className="flex gap-2">
                        <input value={customSubjectInput} onChange={e => setCustomSubjectInput(e.target.value)} placeholder={t('custom_subject_placeholder')} className="flex-grow p-2 border rounded-lg" />
                        <button onClick={handleAddCustomSubject} className={`flex items-center justify-center text-white font-bold p-2 rounded-lg transition-transform active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                          <Plus size={20}/>
                        </button>
                     </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="font-semibold">{t('select_subjects')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allDisplaySubjects.filter(s => typeof s === 'string' && s).map(s => 
                        <button 
                            key={s} 
                            onClick={() => handleSubjectToggle(s)} 
                            className={`p-2 rounded-lg text-sm transition-all duration-200 active:scale-95 ${selectedSubjects.includes(s) ? getThemeClasses('bg') + ' text-white shadow' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                            {tSubject(s)}
                        </button>
                      )}
                  </div>
                </div>

                <button onClick={handleProfileSave} disabled={isSaving} className={`w-full py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-transform active:scale-95 disabled:opacity-70`}>
                    {isSaving ? t('saving') : t('save_profile_info_button')}
                </button>
                
                 <div className="pt-4 border-t">
                    <p className="font-semibold">Google Drive Koppeling</p>
                    {user.isDriveConnected ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                           <p className="font-semibold text-green-700">Verbonden met Google Drive</p>
                           <button onClick={handleDisconnectGoogleDrive} className="flex items-center gap-1 text-sm text-red-600 hover:underline">
                               <Unlink size={14} /> Ontkoppelen
                           </button>
                        </div>
                    ) : (
                        <button onClick={handleConnectGoogleDrive} disabled={isConnecting} className={`w-full mt-2 py-2 px-4 rounded-lg text-white font-bold bg-blue-500 hover:bg-blue-600 transition-transform active:scale-95 flex items-center justify-center gap-2`}>
                            <Link size={16}/> {isConnecting ? 'Bezig met verbinden...' : 'Koppel Google Drive'}
                        </button>
                    )}
                </div>

                 <div className="pt-4 border-t">
                    <p className="font-semibold">{t('password_reset_section_title')}</p>
                    <p className="text-sm text-gray-600">{t('password_reset_section_description', {email: user.email})}</p>
                    <button onClick={handlePasswordReset} className="w-full mt-2 py-2 px-4 rounded-lg text-white font-bold bg-orange-500 hover:bg-orange-600 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">{t('send_reset_email_button')}</button>
                  </div>
            </SettingSection>

            <SettingSection title={t('cleanup_account_section_title')} icon={<Trash2 className="text-orange-600" />} isDanger>
                <p className="text-sm text-gray-700">{t('cleanup_account_section_description')}</p>
                <button onClick={onCleanupAccountRequest} className="w-full mt-2 py-2 px-4 rounded-lg text-white font-bold bg-orange-600 hover:bg-orange-700 transition-transform active:scale-95">
                    {t('cleanup_account_button')}
                </button>
            </SettingSection>

            <div className={`bg-white p-4 sm:p-6 rounded-lg shadow-md animate-fade-in border-2 border-red-500`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 text-red-600`}>
                    <AlertTriangle/>
                    {t('delete_account_section_title')}
                </h3>
                <div className="space-y-4">
                    <p className="text-sm text-gray-700">{t('delete_account_section_description')}</p>
                    <button onClick={onDeleteAccountRequest} className="w-full mt-2 py-2 px-4 rounded-lg text-white font-bold bg-red-600 hover:bg-red-700 transition-transform active:scale-95">
                        {t('delete_account_button')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <>
            <SettingSection title={t('settings_appearance_section')} icon={<Palette className={getThemeClasses('text')} />}>
                <div>
                    <p className="font-semibold">{t('choose_theme')}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                        {availableThemeColors.map(color => <button key={color} onClick={() => handleThemeChange(color)} className={`w-10 h-10 rounded-full transition-transform duration-200 hover:scale-110 active:scale-100 ${colorClasses[color]} ${themeColor === color ? `ring-2 ring-offset-2 ${getThemeClasses('ring')}` : ''}`}></button>)}
                    </div>
                </div>
                 <div>
                    <p className="font-semibold">{t('font_preference')}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {availableFonts.map(font => (
                            <button 
                                key={font.id} 
                                onClick={() => handleFontChange(font.id)}
                                className={`py-2 px-4 rounded-lg border-2 transition-all ${fontFamily === font.id ? getThemeClasses('border') + ' ' + getThemeClasses('bg-light') : 'bg-white border-gray-200 hover:border-gray-400'}`}
                            >
                                <span className={`${font.className} text-lg`}>
                                    {font.name}
                                    {font.id === 'inter' && <span className="text-xs font-normal text-gray-500 ml-1">({t('default')})</span>}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="font-semibold">{t('language_preference')}</p>
                    <div className="mt-2">
                        <div className="relative flex w-full sm:w-1/2 p-1 bg-gray-200 rounded-lg">
                            <button onClick={() => handleLangChange('nl')} className={`relative w-full py-2 text-sm font-bold rounded-md transition-colors z-10 ${language !== 'nl' ? 'text-gray-600' : 'text-gray-900'}`}>
                                {t('dutch')}
                            </button>
                            <button onClick={() => handleLangChange('en')} className={`relative w-full py-2 text-sm font-bold rounded-md transition-colors z-10 ${language !== 'en' ? 'text-gray-600' : 'text-gray-900'}`}>
                                {t('english')}
                            </button>
                            <div
                                className={`absolute top-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] bg-white rounded-md shadow-md transition-transform duration-300 ease-in-out`}
                                style={{ transform: language === 'en' ? 'translateX(calc(100% + 0.25rem))' : 'translateX(0.25rem)'}}
                            />
                        </div>
                    </div>
                </div>
            </SettingSection>
            <SettingSection title={t('home_layout_title')} icon={<Palette className={getThemeClasses('text')} />}>
                <p className="text-sm text-gray-600">{t('home_layout_description')}</p>
                <div className={`p-2 rounded-lg ${getThemeClasses('bg-light')}`}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={homeLayout} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                            {homeLayout.map(id => <SortableItem key={id} id={id} t={t}/>)}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </SettingSection>
            <SettingSection title={t('notifications_settings_title')} icon={<Bell className={getThemeClasses('text')} />}>
                 <div className="flex items-center justify-between">
                    <label htmlFor="notif-toggle" className="font-semibold text-gray-700">{t('enable_notifications')}</label>
                    <button
                        id="notif-toggle"
                        onClick={() => handleNotificationToggle(!notificationsEnabled)}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${notificationsEnabled ? getThemeClasses('bg') : 'bg-gray-300'}`}
                        >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                </div>
            </SettingSection>
        </>
      )}

       {activeTab === 'privacy' && (
        <SettingSection title={t('settings_privacy_section')} icon={<Shield className={getThemeClasses('text')} />}>
            <div className="text-gray-700 space-y-2">
                <p>{t('privacy_policy_content')}</p>
            </div>
        </SettingSection>
      )}

      {activeTab === 'help' && (
          <SettingSection title={t('settings_help_info_section')} icon={<HelpCircle className={getThemeClasses('text')}/>}>
              <button onClick={() => setCurrentView('appInfo')} className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                  <Info className="w-5 h-5"/> {t('app_info')}
              </button>
              <button onClick={() => setCurrentView('faq')} className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                  <HelpCircle className="w-5 h-5"/> {t('faq')}
              </button>
               <button onClick={() => setCurrentView('feedback')} className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                  <LifeBuoy className="w-5 h-5"/> {t('feedback_support')}
              </button>
          </SettingSection>
      )}
    </div>
  );
};

export default SettingsView;