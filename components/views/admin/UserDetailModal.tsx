

import React from 'react';
import { auth, sendPasswordResetEmail } from '../../../services/firebase';
import type { AppUser, ModalContent } from '../../../types';
import { User, Palette, Mail, X, KeyRound, School, BookOpen, Type } from 'lucide-react';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  t: (key: string, replacements?: any) => string;
  tSubject: (key: string) => string;
  getThemeClasses: (variant: string) => string;
  showAppModal: (content: ModalContent) => void;
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500 font-semibold uppercase">{label}</p>
        <p className="text-gray-800">{value || '-'}</p>
    </div>
);

const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, onClose, user, t, tSubject, getThemeClasses, showAppModal }) => {
    if (!isOpen || !user) return null;

    const handlePasswordReset = () => {
        if (!user.email) return;
        sendPasswordResetEmail(auth, user.email)
            .then(() => {
                showAppModal({ text: t('password_reset_sent', { email: user.email }) });
            })
            .catch(error => {
                showAppModal({ text: t('error_password_reset_failed') + `: ${error.message}` });
            });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full transform transition-all duration-300 scale-100 animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <img src={user.profilePictureUrl} alt={user.userName} className="w-16 h-16 rounded-full object-cover border-2 border-purple-200" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{user.userName}</h3>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {/* Account Details */}
                    <div className="p-4 rounded-lg bg-gray-50">
                        <h4 className="font-bold text-purple-700 flex items-center gap-2 mb-3"><User size={18}/> Account Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label={t('school_name')} value={user.schoolName} />
                            <DetailItem label={t('class_name')} value={user.className} />
                            <DetailItem label={t('education_level')} value={tSubject(user.educationLevel)} />
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="p-4 rounded-lg bg-gray-50">
                        <h4 className="font-bold text-purple-700 flex items-center gap-2 mb-3"><Palette size={18}/> Preferences</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <DetailItem label={t('language_preference')} value={t(user.languagePreference)} />
                            <DetailItem label={t('font_preference')} value={user.fontPreference} />
                            <DetailItem label={t('choose_theme')} value={user.themePreference} />
                        </div>
                    </div>

                    {/* Subjects */}
                    <div className="p-4 rounded-lg bg-gray-50">
                        <h4 className="font-bold text-purple-700 flex items-center gap-2 mb-3"><BookOpen size={18}/> Selected Subjects</h4>
                        <div className="flex flex-wrap gap-2">
                            {(user.selectedSubjects || []).map(s => <span key={s} className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{tSubject(s)}</span>)}
                        </div>
                         <h4 className="font-bold text-purple-700 flex items-center gap-2 mt-4 mb-3"><Type size={18}/> Custom Subjects</h4>
                         <div className="flex flex-wrap gap-2">
                            {(user.customSubjects || []).length > 0 ? user.customSubjects?.map(s => <span key={s} className="bg-gray-200 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{tSubject(s)}</span>) : <p className="text-sm text-gray-500">-</p>}
                        </div>
                    </div>

                    {/* Admin Actions */}
                     <div className="p-4 rounded-lg border-2 border-orange-300 bg-orange-50">
                        <h4 className="font-bold text-orange-700 flex items-center gap-2 mb-3"><KeyRound size={18}/> Admin Actions</h4>
                        <button onClick={handlePasswordReset} className="w-full mt-2 py-2 px-4 rounded-lg text-white font-bold bg-orange-500 hover:bg-orange-600 transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <Mail size={16}/> {t('send_reset_email_button')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default UserDetailModal;