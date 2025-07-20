


import React from 'react';
import type { AdminSettings } from '../../../types';
import { availableThemeColors, availableFonts } from '../../../constants';
import { Palette, Shield, Type } from 'lucide-react';

interface AdminSettingsViewProps {
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
    getThemeClasses: (variant: string) => string;
    settings: AdminSettings;
    onUpdate: (updatedData: Partial<AdminSettings>) => Promise<void>;
    onPinDisableRequest: () => void;
}

const colorClasses: {[key: string]: string} = {
    emerald: 'bg-emerald-500', blue: 'bg-blue-500', rose: 'bg-rose-500',
    purple: 'bg-purple-500', pink: 'bg-pink-500', indigo: 'bg-indigo-500',
    teal: 'bg-teal-500', amber: 'bg-amber-500',
};

const SettingSection: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode, getThemeClasses: (v: string) => string }> = ({ title, children, icon, getThemeClasses }) => (
    <div className={`bg-white p-4 sm:p-6 rounded-lg shadow-md`}>
        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${getThemeClasses('text')}`}>
            {icon}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ t, getThemeClasses, settings, onUpdate, onPinDisableRequest }) => {
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <SettingSection title={t('admin_appearance_settings')} icon={<Palette />} getThemeClasses={getThemeClasses}>
                <div>
                    <p className="font-semibold">{t('choose_theme')}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                        {availableThemeColors.map(color => (
                            <button 
                                key={color} 
                                onClick={() => onUpdate({ themePreference: color })} 
                                className={`w-10 h-10 rounded-full transition-transform duration-200 hover:scale-110 active:scale-100 ${colorClasses[color]} ${settings.themePreference === color ? `ring-2 ring-offset-2 ${getThemeClasses('ring')}` : ''}`}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <p className="font-semibold">{t('font_preference')}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {availableFonts.map(font => (
                            <button 
                                key={font.id} 
                                onClick={() => onUpdate({ fontPreference: font.id })}
                                className={`py-2 px-4 rounded-lg border-2 transition-all ${settings.fontPreference === font.id ? getThemeClasses('border') + ' ' + getThemeClasses('bg-light') : 'bg-white border-gray-200 hover:border-gray-400'}`}
                            >
                                <span className={`${font.className} text-lg`}>{font.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </SettingSection>

             <SettingSection title={t('admin_security_settings')} icon={<Shield />} getThemeClasses={getThemeClasses}>
                 <div className="flex items-center justify-between">
                    <label htmlFor="pin-toggle" className="font-semibold text-gray-700">{t('admin_pin_toggle_label')}</label>
                    <button
                        id="pin-toggle"
                        onClick={() => {
                            if (settings.pinProtectionEnabled) {
                                onPinDisableRequest();
                            } else {
                                onUpdate({ pinProtectionEnabled: true });
                            }
                        }}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${settings.pinProtectionEnabled ? getThemeClasses('bg') : 'bg-gray-300'}`}
                        >
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.pinProtectionEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                </div>
            </SettingSection>
        </div>
    );
};

export default AdminSettingsView;