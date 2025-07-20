import React, { useState, useEffect, useMemo } from 'react';
import { db, appId, Timestamp, collection, query, where, orderBy, onSnapshot, addDoc } from '../../services/firebase';
import type { AppUser, Feedback, FeedbackReply } from '../../types';
import { ArrowLeft, Send, LifeBuoy, User, Shield } from 'lucide-react';

interface FeedbackViewProps {
  user: AppUser;
  t: (key: string, replacements?: any) => string;
  getThemeClasses: (variant: string) => string;
  setCurrentView: (view: string) => void;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ user, t, getThemeClasses, setCurrentView }) => {
    const [history, setHistory] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, `artifacts/${appId}/public/data/feedback`),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
            setHistory(fetchedHistory);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user.uid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            alert(t('error_fill_all_fields'));
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/feedback`), {
                userId: user.uid,
                userName: user.userName,
                userEmail: user.email,
                subject,
                message,
                status: 'new',
                createdAt: Timestamp.now(),
                replies: [],
            });
            alert(t('feedback_sent_success'));
            setSubject('');
            setMessage('');
        } catch (error) {
            console.error("Error sending feedback: ", error);
            alert(t('error_feedback_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const sortedHistory = useMemo(() => {
        return history.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }, [history]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <button onClick={() => setCurrentView('settings')} className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors active:scale-95">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('settings')}
                </button>
                <h2 className={`text-3xl font-bold ${getThemeClasses('text-strong')}`}>{t('feedback_title')}</h2>
                <div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <div className={`bg-white p-6 rounded-xl shadow-lg`}>
                        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${getThemeClasses('text-strong')}`}>
                            <LifeBuoy />
                            {t('feedback_title')}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">{t('feedback_subtitle')}</p>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t('feedback_subject_placeholder')}
                                className="w-full p-2 border rounded-lg"
                                required
                            />
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('feedback_message_placeholder')}
                                rows={5}
                                className="w-full p-2 border rounded-lg"
                                required
                            />
                            <button type="submit" disabled={isSubmitting} className={`w-full flex items-center justify-center gap-2 text-white font-bold py-2 px-4 rounded-lg transition-transform active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} disabled:opacity-70`}>
                                <Send className="w-4 h-4" />
                                {isSubmitting ? t('sending') : t('send_feedback_button')}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                     <div className={`bg-white p-6 rounded-xl shadow-lg min-h-[50vh]`}>
                         <h3 className="text-xl font-bold mb-4">{t('your_feedback_history')}</h3>
                         {isLoading ? (
                            <p>Loading history...</p>
                         ) : sortedHistory.length === 0 ? (
                            <p className="text-center text-gray-500 italic py-8">{t('no_feedback_history')}</p>
                         ) : (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {sortedHistory.map(item => (
                                    <div key={item.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-gray-800">{item.subject}</p>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.status === 'replied' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {t(`status_${item.status}`)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">{item.createdAt.toDate().toLocaleString()}</p>
                                        
                                        <div className="space-y-3 mt-2">
                                            {/* User's original message */}
                                            <div className="flex items-start gap-2.5">
                                                <div className="p-2 bg-gray-200 rounded-full"><User size={16} /></div>
                                                <div className="flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl">
                                                    <p className="text-sm font-normal text-gray-900">{item.message}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Admin replies */}
                                            {item.replies?.map((reply, index) => (
                                                <div key={index} className="flex items-start gap-2.5 justify-end">
                                                    <div className="flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-200 bg-purple-100 rounded-s-xl rounded-ee-xl">
                                                        <p className="text-sm font-normal text-gray-900">{reply.text}</p>
                                                    </div>
                                                    <div className={`p-2 rounded-full ${getThemeClasses('bg')}`}><Shield size={16} className="text-white"/></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackView;