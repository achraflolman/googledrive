import React, { useState } from 'react';
import { auth, sendEmailVerification } from '../../services/firebase';
import type { AppUser } from '../../types';
import { MailCheck } from 'lucide-react';

interface EmailVerificationViewProps {
    user: AppUser;
    t: (key: string, replacements?: any) => string;
    getThemeClasses: (variant: string) => string;
    handleLogout: () => void;
    onSkip: () => void;
}

const EmailVerificationView: React.FC<EmailVerificationViewProps> = ({ user, t, getThemeClasses, handleLogout, onSkip }) => {
    const [isSending, setIsSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleResend = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setIsSending(true);
        try {
            await sendEmailVerification(currentUser);
            setEmailSent(true);
            setTimeout(() => setEmailSent(false), 5000); // Reset message after 5s
        } catch (error) {
            console.error("Error resending verification email", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleContinue = async () => {
        if (auth.currentUser) {
            // This forces a refresh of the user's authentication state from Firebase
            await auth.currentUser.reload();
        }
        // This re-triggers the onAuthStateChanged listener in App.tsx
        // which will now see the updated emailVerified status.
        window.location.reload();
    };

    return (
        <div className={`min-h-screen w-full flex items-center justify-center p-4 animate-fade-in-slow ${getThemeClasses('bg')}`}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
                <MailCheck className={`w-16 h-16 mx-auto mb-4 ${getThemeClasses('text')}`} />
                <h2 className={`text-2xl font-bold mb-3 ${getThemeClasses('text-strong')}`}>{t('verify_email_title')}</h2>
                <p className="text-gray-600 mb-4">
                    {t('verify_email_instructions', { email: user.email })}
                </p>
                <p className="text-sm text-gray-500 mb-6">{t('verify_email_spam_check')}</p>

                <button
                    onClick={handleContinue}
                    className={`w-full font-bold py-3 px-4 rounded-lg text-white mb-3 shadow-lg hover:shadow-xl transition-all duration-200 transform active:scale-[.98] ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}
                >
                    {t('verify_email_continue_button')}
                </button>
                
                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-left text-sm">
                    <p className="font-bold text-yellow-800">Tijdelijke testknop</p>
                    <p className="text-yellow-700">De e-mail verificatie wordt momenteel herzien. Gebruik deze knop om tijdelijk door te gaan zonder verificatie. Deze optie wordt binnenkort verwijderd.</p>
                </div>
                <button
                    onClick={onSkip}
                    className="w-full font-bold py-2 px-4 rounded-lg bg-gray-500 hover:bg-gray-600 text-white mt-3 shadow-md"
                >
                    Sla verificatie over (Test)
                </button>
                
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                        onClick={handleResend}
                        disabled={isSending || emailSent}
                        className="text-sm font-semibold text-gray-500 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                        {isSending ? t('sending') : (emailSent ? t('email_sent') : t('verify_email_resend_button'))}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-sm font-semibold text-red-500 hover:underline"
                    >
                        {t('logout_button')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationView;