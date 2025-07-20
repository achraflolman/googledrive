


import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PinVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    t: (key: string) => string;
    getThemeClasses: (variant: string) => string;
}

const PinVerificationModal: React.FC<PinVerificationModalProps> = ({ isOpen, onClose, onSuccess, t, getThemeClasses }) => {
    const [answer, setAnswer] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const SECRET_ANSWER = 'ALICEINBORDERLAND';

    const handleConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (answer.trim().toUpperCase() === SECRET_ANSWER) {
            onSuccess();
        } else {
            setError(t('admin_pin_error_incorrect'));
        }
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all duration-300 scale-100 animate-scale-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2 text-gray-800">{t('admin_pin_verify_title')}</h3>
                <p className="text-gray-600 mb-4">{t('admin_pin_verify_desc')}</p>
                <form onSubmit={handleConfirm}>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        {t('admin_pin_secret_question')}
                    </label>
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder={t('admin_pin_answer_placeholder')}
                        className={`w-full p-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
                        required
                    />
                    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95">{t('cancel_button')}</button>
                        <button type="submit" disabled={isVerifying} className={`py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} disabled:opacity-50 transition-colors active:scale-95 w-40 flex items-center justify-center`}>
                             {isVerifying ? <Loader2 className="w-5 h-5 animate-spin"/> : t('confirm_button')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PinVerificationModal;