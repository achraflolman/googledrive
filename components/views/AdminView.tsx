import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, appId, Timestamp, arrayUnion, collection, query, orderBy, getDocs, where, addDoc, updateDoc, doc, writeBatch } from '../../services/firebase';
import type { AppUser, ModalContent, BroadcastData, Feedback, AdminSettings } from '../../types';
import { LogOut, Send, Users, Activity, RefreshCw, UserCheck, UserX, Search, MessageCircle, Trash2, Award, Settings, ShieldCheck, ShieldX } from 'lucide-react';
import AdminSettingsView from './admin/AdminSettingsView';

interface AdminViewProps {
    user: AppUser;
    t: (key: string, replacements?: any) => string;
    tSubject: (key: string) => string;
    getThemeClasses: (variant: string) => string;
    handleLogout: () => void;
    showAppModal: (content: ModalContent) => void;
    onUserClick: (user: AppUser) => void;
    adminSettings: AdminSettings;
    onAdminSettingsUpdate: (updatedData: Partial<AdminSettings>) => Promise<void>;
    onPinDisableRequest: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ user, t, tSubject, getThemeClasses, handleLogout, showAppModal, onUserClick, adminSettings, onAdminSettingsUpdate, onPinDisableRequest }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [broadcasts, setBroadcasts] = useState<BroadcastData[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [replyText, setReplyText] = useState('');
    
    const fetchAllData = useCallback(async (tab: string) => {
        setIsLoading(true);
        try {
            if (tab === 'users') {
                const usersCollectionRef = collection(db, `artifacts/${appId}/public/data/users`);
                const q = query(usersCollectionRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const usersList = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as AppUser));
                setUsers(usersList);
            }
            if (tab === 'broadcasts') {
                const broadcastsCollectionRef = collection(db, `artifacts/${appId}/public/data/broadcasts`);
                const q = query(broadcastsCollectionRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                setBroadcasts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BroadcastData)));
            }
            if (tab === 'feedback') {
                const feedbacksCollectionRef = collection(db, `artifacts/${appId}/public/data/feedback`);
                const q = query(feedbacksCollectionRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                setFeedbacks(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Feedback)));
            }
        } catch (error) { console.error(`Error fetching ${tab}:`, error); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => {
        fetchAllData(activeTab);
    }, [activeTab, fetchAllData]);

    const displayedUsers = useMemo(() => {
        const nonAdminUsers = users.filter(u => u.email !== 'admin1069@gmail.com');
        if (!searchQuery) return nonAdminUsers;
        return nonAdminUsers.filter(u =>
            u.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const topStreaks = useMemo(() => {
        return [...users]
            .filter(u => u.streakCount && u.streakCount > 0 && !u.isAdmin)
            .sort((a,b) => (b.streakCount || 0) - (a.streakCount || 0))
            .slice(0, 5);
    }, [users]);

    const handleSendBroadcast = async () => {
        if (!broadcastMessage.trim() || !broadcastTitle.trim()) {
            showAppModal({ text: t('error_broadcast_empty') });
            return;
        }
        setIsSending(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/broadcasts`), {
                title: broadcastTitle,
                message: broadcastMessage,
                sender: user.userName,
                createdAt: Timestamp.now(),
            });
            showAppModal({ text: t('broadcast_success') });
            setBroadcastMessage('');
            setBroadcastTitle('');
            fetchAllData('broadcasts');
        } catch (error) {
            showAppModal({ text: t('error_broadcast_failed') });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleToggleUserStatus = async (targetUser: AppUser) => {
        const isDisabling = !targetUser.disabled;
        const confirmText = isDisabling
            ? t('confirm_disable_user', { name: targetUser.userName })
            : t('confirm_enable_user', { name: targetUser.userName });

        showAppModal({
            text: confirmText,
            confirmAction: async () => {
                try {
                    const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${targetUser.uid}`);
                    await updateDoc(userDocRef, { disabled: isDisabling });
                    showAppModal({ text: t('user_status_updated') });
                    fetchAllData('users');
                } catch (error) { showAppModal({ text: t('error_user_status_update') }); }
            },
            cancelAction: () => {}
        });
    };
    
    const handleDeleteAllBroadcasts = async () => {
        showAppModal({
            text: t('confirm_delete_all_broadcasts_and_notifications'),
            confirmAction: async () => {
                setIsLoading(true);
                try {
                    // Step 1: Fetch all users to get their UIDs for notifications
                    const usersCollectionRef = collection(db, `artifacts/${appId}/public/data/users`);
                    const usersSnapshot = await getDocs(usersCollectionRef);
                    const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as AppUser));

                    // Step 2: Collect all broadcast-related notification references to delete
                    const notifRefsToDelete: any[] = [];
                    for (const u of allUsers) {
                        if (u.isAdmin) continue;
                        const notifsRef = collection(db, `artifacts/${appId}/users/${u.uid}/notifications`);
                        const notifSnapshot = await getDocs(query(notifsRef, where('type', '==', 'admin')));
                        notifSnapshot.forEach(doc => notifRefsToDelete.push(doc.ref));
                    }

                    // Step 3: Delete notifications in batches of 500
                    for (let i = 0; i < notifRefsToDelete.length; i += 500) {
                        const batch = writeBatch(db);
                        const chunk = notifRefsToDelete.slice(i, i + 500);
                        chunk.forEach(ref => batch.delete(ref));
                        await batch.commit();
                    }

                    // Step 4: Collect and delete all broadcast documents in batches
                    const broadcastCollectionRef = collection(db, `artifacts/${appId}/public/data/broadcasts`);
                    const broadcastsSnapshot = await getDocs(broadcastCollectionRef);
                    const broadcastRefs = broadcastsSnapshot.docs.map(doc => doc.ref);
                    
                    for (let i = 0; i < broadcastRefs.length; i += 500) {
                        const batch = writeBatch(db);
                        const chunk = broadcastRefs.slice(i, i + 500);
                        chunk.forEach(ref => batch.delete(ref));
                        await batch.commit();
                    }

                    showAppModal({ text: t('all_broadcasts_deleted') });
                    fetchAllData('broadcasts'); // Refresh the view
                } catch (err) {
                    console.error("Error deleting all broadcasts:", err);
                    const error = err as Error;
                    showAppModal({ text: `${t('error_deletion_failed')}: ${error.message}` });
                } finally {
                    setIsLoading(false);
                }
            },
            cancelAction: () => {}
        });
    };

    const handleSendReply = async () => {
        if (!selectedFeedback || !replyText.trim()) return;
        setIsSending(true);
        try {
            const feedbackRef = doc(db, `artifacts/${appId}/public/data/feedback/${selectedFeedback.id}`);
            await updateDoc(feedbackRef, {
                status: 'replied',
                replies: arrayUnion({
                    text: replyText,
                    repliedAt: Timestamp.now(),
                    repliedBy: 'admin',
                    isAdminReply: true,
                })
            });
            showAppModal({text: t('reply_sent_success')});
            setReplyText('');
            setSelectedFeedback(null);
            fetchAllData('feedback');
        } catch(e) {
            showAppModal({text: t('error_reply_failed')});
        } finally {
            setIsSending(false);
        }
    }
    
    const tabs = [
        { id: 'users', label: t('users'), icon: <Users /> },
        { id: 'broadcasts', label: t('broadcasts'), icon: <Send /> },
        { id: 'feedback', label: t('admin_feedback_dashboard'), icon: <MessageCircle /> },
        { id: 'settings', label: t('settings'), icon: <Settings /> },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                <h1 className={`text-2xl font-bold ${getThemeClasses('text-logo')}`}>{t('admin_dashboard')}</h1>
                <div className="flex items-center gap-4">
                    <span className="font-semibold">{t('welcome_message', { name: user.userName })}</span>
                    <button onClick={handleLogout} title={t('logout_button')} className="p-2 rounded-lg text-red-500 bg-red-100 hover:bg-red-200 transition-colors duration-200 active:scale-90">
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </header>
            
            <nav className="p-4 bg-white border-b">
                 <div className="flex justify-center flex-wrap gap-2">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-2 px-4 font-semibold rounded-md transition-colors ${activeTab === tab.id ? `${getThemeClasses('bg')} text-white shadow` : 'text-gray-600 hover:bg-gray-200'}`}>
                           {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </nav>

            <main className="p-4 sm:p-6 lg:p-8">
                {isLoading ? <div className="text-center text-gray-500">{t('loading_data')}</div> :
                <>
                {activeTab === 'users' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Users /> {t('users')} ({displayedUsers.length})</h2>
                                <div className="flex items-center gap-4">
                                    <div className="relative"><input type="text" placeholder={t('admin_search_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 pr-2 py-2 border rounded-lg w-full sm:w-64 bg-white"/><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" /></div>
                                    <button onClick={() => fetchAllData('users')} disabled={isLoading} className="flex items-center gap-2 font-semibold bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg transition-colors active:scale-95 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />{t('refresh_data')}</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[65vh]">
                                <table className="w-full text-sm text-left text-gray-500"><thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0"><tr><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Email</th><th scope="col" className="px-4 py-3">{t('last_login')}</th><th scope="col" className="px-4 py-3">{t('status')}</th><th scope="col" className="px-4 py-3">Verified</th><th scope="col" className="px-4 py-3">{t('actions')}</th></tr></thead><tbody>
                                    {displayedUsers.map(u => (<tr key={u.uid} onClick={() => onUserClick(u)} className="bg-white border-b hover:bg-gray-50 cursor-pointer"><td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">{u.userName}</td><td className="px-4 py-4">{u.email}</td><td className="px-4 py-4">{u.lastLoginDate?.toDate().toLocaleDateString() || 'N/A'}</td><td className="px-4 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{u.disabled ? t('disabled') : t('active')}</span></td><td className="px-4 py-4 text-center">{u.isVerifiedByEmail ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldX className="w-5 h-5 text-red-500" />}</td><td className="px-4 py-4"><button onClick={(e) => { e.stopPropagation(); handleToggleUserStatus(u); }} title={u.disabled ? t('enable_user') : t('disable_user')} className={`p-2 rounded-lg transition-colors active:scale-90 ${u.disabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>{u.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}</button></td></tr>))}</tbody></table>
                            </div>
                        </div>
                        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                             <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${getThemeClasses('text-strong')}`}><Award /> {t('admin_streak_leaderboard')}</h2>
                             {topStreaks.length > 0 ? (
                                <ol className="space-y-3">
                                    {topStreaks.map((u, index) => (
                                        <li key={u.uid} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold text-lg ${index < 3 ? getThemeClasses('text') : 'text-gray-500'}`}>{index+1}</span>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{u.userName}</p>
                                                    <p className="text-xs text-gray-500">{u.email}</p>
                                                </div>
                                            </div>
                                            <strong className={`${getThemeClasses('text')} font-mono text-lg`}>{u.streakCount} days</strong>
                                        </li>
                                    ))}
                                </ol>
                             ) : <p>{t('no_streak_users')}</p>}
                        </div>
                    </div>
                )}
                {activeTab === 'broadcasts' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md"><h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Send /> {t('send_broadcast')}</h2><div className="space-y-3"><input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder={t('broadcast_title_placeholder')} className="w-full p-2 border rounded-lg" /><textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder={t('broadcast_message_placeholder')} rows={4} className="w-full p-2 border rounded-lg" disabled={isSending}/><button onClick={handleSendBroadcast} disabled={isSending} className={`w-full ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-60`}>{isSending ? t('sending') : t('send_message_button')}</button></div></div>
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{t('past_broadcasts')}</h2><button onClick={handleDeleteAllBroadcasts} disabled={broadcasts.length === 0} className="flex items-center gap-2 text-sm text-red-600 bg-red-100 hover:bg-red-200 font-semibold px-3 py-2 rounded-lg transition-colors active:scale-95 disabled:opacity-50"><Trash2 size={16}/>{t('delete_all_broadcasts')}</button></div><div className="space-y-3 max-h-[60vh] overflow-y-auto">{broadcasts.length === 0 ? <p>{t('no_past_broadcasts')}</p> : broadcasts.map(b=>(<div key={b.id} className="p-3 bg-gray-50 rounded-md"><p className="font-bold">{b.title}</p><p className="text-sm text-gray-700">{b.message}</p><p className="text-xs text-gray-400 mt-1">{b.createdAt.toDate().toLocaleString()}</p></div>))}</div></div>
                    </div>
                )}
                {activeTab === 'feedback' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md max-h-[80vh] overflow-y-auto"><h2 className="text-xl font-bold mb-4">{t('admin_feedback_dashboard')} ({feedbacks.length})</h2><div className="space-y-4">{feedbacks.map(f => (<div key={f.id} className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${selectedFeedback?.id === f.id ? `${getThemeClasses('bg-light')} ring-2 ${getThemeClasses('ring')}` : 'bg-gray-50 hover:bg-gray-100'}`} onClick={() => setSelectedFeedback(f)}><div className="flex justify-between items-center"><p className="font-bold">{f.subject}</p><span className={`px-2 py-1 rounded-full text-xs font-semibold ${f.status === 'new' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{t(`status_${f.status}`)}</span></div><p className="text-sm text-gray-600">{t('from')}: {f.userName} ({f.userEmail})</p><p className="text-xs text-gray-400 mt-1">{t('submitted_on')}: {f.createdAt.toDate().toLocaleString()}</p></div>))}</div></div>
                        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">{selectedFeedback ? (<div className="space-y-3"><h3 className="font-bold text-lg">{selectedFeedback.subject}</h3><p className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap">{selectedFeedback.message}</p><h4 className="font-bold pt-4 border-t">{t('reply_to_feedback')}</h4><textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder={t('your_reply_placeholder')} rows={5} className="w-full p-2 border rounded-lg" disabled={isSending}/><button onClick={handleSendReply} disabled={isSending} className={`w-full ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-60`}>{isSending ? t('sending') : t('send_reply_button')}</button></div>) : <p className="text-center text-gray-500">{t('admin_select_feedback')}</p>}</div>
                    </div>
                )}
                {activeTab === 'settings' && (
                    <AdminSettingsView 
                        t={t}
                        getThemeClasses={getThemeClasses}
                        settings={adminSettings}
                        onUpdate={onAdminSettingsUpdate}
                        onPinDisableRequest={onPinDisableRequest}
                    />
                )}
                </>
                }
            </main>
        </div>
    );
};

export default AdminView;