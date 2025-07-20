import React, { useEffect, useState } from 'react';
import { db, appId, writeBatch, doc, collection, getDocs } from '../../services/firebase';
import type { AppUser, Notification, ModalContent } from '../../types';
import { Bell, Flame, UserCog, CheckCheck, MessageSquare, ArrowLeft, Trash2, LifeBuoy } from 'lucide-react';

interface NotificationsViewProps {
    user: AppUser;
    notifications: Notification[];
    t: (key: string) => string;
    getThemeClasses: (variant: string) => string;
    setCurrentView: (view: string) => void;
    onProfileUpdate: (updatedData: Partial<AppUser>) => Promise<void>;
    showBroadcast: (broadcastId: string) => void;
    showAppModal: (content: ModalContent) => void;
}

const NotificationIcon = ({ type, getThemeClasses }: { type: Notification['type'], getThemeClasses: (v: string) => string }) => {
    switch (type) {
        case 'admin':
            return <div className="p-3 bg-purple-100 rounded-full"><UserCog className="w-5 h-5 text-purple-600" /></div>;
        case 'streak':
            return <div className="p-3 bg-orange-100 rounded-full"><Flame className="w-5 h-5 text-orange-500" /></div>;
        case 'feedback_reply':
            return <div className="p-3 bg-green-100 rounded-full"><LifeBuoy className="w-5 h-5 text-green-600" /></div>;
        case 'system':
        default:
            return <div className="p-3 bg-blue-100 rounded-full"><Bell className="w-5 h-5 text-blue-600" /></div>;
    }
};

const NotificationsView: React.FC<NotificationsViewProps> = ({ user, notifications, t, getThemeClasses, setCurrentView, showBroadcast, showAppModal }) => {
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        // Mark notifications as read when the component is mounted
        if (!user.notificationsEnabled) return;
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
            const batch = writeBatch(db);
            unreadIds.forEach(id => {
                const notifRef = doc(db, `artifacts/${appId}/users/${user.uid}/notifications/${id}`);
                batch.update(notifRef, { read: true });
            });
            batch.commit().catch(err => console.error("Failed to mark notifications as read:", err));
        }
    }, [notifications, user.uid, user.notificationsEnabled]);

    const handleNotificationClick = (notif: Notification) => {
        if (notif.type === 'admin' && notif.broadcastId) {
            showBroadcast(notif.broadcastId);
        }
        if (notif.type === 'feedback_reply' && notif.feedbackId) {
            setCurrentView('feedback');
        }
    };
    
    const handleClearAll = () => {
        showAppModal({
            text: t('confirm_clear_all_notifications'),
            confirmAction: async () => {
                setIsClearing(true);
                const notifsRef = collection(db, `artifacts/${appId}/users/${user.uid}/notifications`);
                const snapshot = await getDocs(notifsRef);
                const batch = writeBatch(db);
                snapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                showAppModal({ text: t('notifications_cleared') });
                setIsClearing(false);
            },
            cancelAction: () => {}
        });
    }

    if (!user.notificationsEnabled) {
         return (
             <div className="space-y-6 animate-fade-in text-center">
                <div className="flex justify-between items-center">
                    <button onClick={() => setCurrentView('home')} className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors active:scale-95"><ArrowLeft className="w-4 h-4 mr-2"/>{t('back_button')}</button>
                    <h2 className={`text-3xl font-bold ${getThemeClasses('text-strong')}`}>{t('notifications_title')}</h2>
                    <div className="w-24"></div>
                </div>
                <div className={`p-6 sm:p-8 rounded-xl shadow-lg ${getThemeClasses('bg-light')} min-h-[60vh] flex flex-col justify-center items-center`}>
                    <Bell className="mx-auto h-20 w-20 text-gray-300" />
                    <h3 className="mt-4 text-xl font-semibold text-gray-700">{t('no_notifications_disabled_title')}</h3>
                    <p className="text-gray-500 mt-1">{t('no_notifications_disabled_text')}</p>
                     <button onClick={() => setCurrentView('settings')} className={`mt-4 font-bold py-2 px-4 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-transform active:scale-95`}>
                        {t('settings')}
                    </button>
                </div>
             </div>
         )
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                 <button onClick={() => setCurrentView('home')} className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors active:scale-95">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('back_button')}
                </button>
                <h2 className={`text-3xl font-bold ${getThemeClasses('text-strong')}`}>{t('notifications_title')}</h2>
                 <button onClick={handleClearAll} disabled={notifications.length === 0 || isClearing} className="flex items-center gap-2 text-sm text-red-600 bg-red-100 hover:bg-red-200 font-semibold px-3 py-2 rounded-lg transition-colors active:scale-95 disabled:opacity-50">
                    <Trash2 size={16}/>
                 </button>
            </div>

            <div className={`p-4 sm:p-6 rounded-xl shadow-lg ${getThemeClasses('bg-light')} min-h-[60vh]`}>
                {notifications.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <MessageSquare className="mx-auto h-20 w-20 text-gray-300" />
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">{t('no_notifications')}</h3>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {notifications.map(notif => (
                            <li key={notif.id} onClick={() => handleNotificationClick(notif)} className={`bg-white p-4 rounded-lg shadow-sm flex items-start gap-4 transition-all duration-300 ${(notif.type === 'admin' || notif.type === 'feedback_reply') ? 'cursor-pointer hover:shadow-md' : ''} ${!notif.read ? 'border-l-4 ' + getThemeClasses('border') : 'opacity-80'}`}>
                                <NotificationIcon type={notif.type} getThemeClasses={getThemeClasses} />
                                <div className="flex-1">
                                    {notif.title && <p className="font-bold text-gray-900">{notif.title}</p>}
                                    <p className="text-gray-800">{notif.text}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {notif.createdAt.toDate().toLocaleString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;