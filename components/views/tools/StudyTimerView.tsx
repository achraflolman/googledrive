import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import type { AppUser, ModalContent, ToDoTask } from '../../../types';
import { db, appId, collection, query, orderBy, onSnapshot } from '../../../services/firebase';


interface StudyTimerViewProps {
  t: (key: string, replacements?: any) => string;
  getThemeClasses: (variant: string) => string;
  user: AppUser;
  userId: string;
  showAppModal: (content: ModalContent) => void;
  // Persistent Timer Props
  focusMinutes: number;
  setFocusMinutes: (m: number) => void;
  breakMinutes: number;
  setBreakMinutes: (m: number) => void;
  timerMode: 'focus' | 'break';
  setTimerMode: (m: 'focus' | 'break') => void;
  timeLeft: number;
  setTimeLeft: (s: number) => void;
  isTimerActive: boolean;
  setIsTimerActive: (a: boolean) => void;
  selectedTaskForTimer: ToDoTask | null;
  setSelectedTaskForTimer: (t: ToDoTask | null) => void;
}

const StudyTimerView: React.FC<StudyTimerViewProps> = ({ 
    t, getThemeClasses, showAppModal, user, userId,
    focusMinutes, setFocusMinutes, breakMinutes, setBreakMinutes, timerMode, setTimerMode,
    timeLeft, setTimeLeft, isTimerActive, setIsTimerActive,
    selectedTaskForTimer, setSelectedTaskForTimer
}) => {

  const [tasks, setTasks] = useState<ToDoTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  useEffect(() => {
    if (user.uid === 'guest-user') {
        setTasks([]);
        setIsLoadingTasks(false);
        return;
    }
    const q = query(collection(db, `artifacts/${appId}/users/${userId}/tasks`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setTasks(snapshot.docs.map(d => ({id: d.id, ...d.data()} as ToDoTask)));
      setIsLoadingTasks(false);
    }, (error) => {
        showAppModal({text: t('error_failed_to_load_tasks')});
        setIsLoadingTasks(false);
    });
    return () => unsubscribe();
  }, [userId, user.uid, showAppModal, t]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  const resetTimer = useCallback(() => {
    setIsTimerActive(false);
    setTimeLeft(timerMode === 'focus' ? focusMinutes * 60 : breakMinutes * 60);
  }, [timerMode, focusMinutes, breakMinutes, setIsTimerActive, setTimeLeft]);
  
  const totalDuration = timerMode === 'focus' ? focusMinutes * 60 : breakMinutes * 60;
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) : 0;
  const strokeDashoffset = 283 * (1 - progress);

  return (
    <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} flex flex-col items-center space-y-4`}>
        <div className="w-full flex justify-center gap-2 sm:gap-4">
            <div className="flex-1 max-w-xs">
                <label className="block text-center font-semibold">{t('focus_session')} (min)</label>
                <input type="number" value={focusMinutes} onChange={e => setFocusMinutes(Number(e.target.value))} onBlur={() => {if(focusMinutes < 1) setFocusMinutes(1)}} disabled={isTimerActive} className="w-full p-2 border rounded-lg text-center"/>
            </div>
            <div className="flex-1 max-w-xs">
                <label className="block text-center font-semibold">{t('break_session')} (min)</label>
                <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} onBlur={() => {if(breakMinutes < 1) setBreakMinutes(1)}} disabled={isTimerActive} className="w-full p-2 border rounded-lg text-center"/>
            </div>
        </div>
        
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 my-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-200" strokeWidth="7" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                <circle 
                    className={getThemeClasses('text')} 
                    strokeWidth="7" 
                    strokeDasharray="283"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="45" cx="50" cy="50"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }}
                />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl font-bold ${getThemeClasses('text-strong')}`}>
                {formatTime(timeLeft)}
            </div>
        </div>
        
        <div className="flex gap-4">
            <button onClick={() => setIsTimerActive(!isTimerActive)} className={`flex items-center gap-2 p-4 rounded-full text-white shadow-lg transition-transform active:scale-90 ${getThemeClasses('bg')}`}>
                {isTimerActive ? <Pause size={28}/> : <Play size={28}/>}
            </button>
            <button onClick={resetTimer} className="flex items-center gap-2 p-4 rounded-full bg-white shadow-lg transition-transform active:scale-90">
                <RefreshCw size={28}/>
            </button>
        </div>

        <div className="w-full max-w-md pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-center mb-2">{t('Focusing on:')}</h3>
            {isLoadingTasks ? (
                <div className="flex justify-center items-center gap-2 text-gray-500"><Loader2 className="animate-spin w-5 h-5" /> Loading tasks...</div>
            ) : (
                 <select 
                    value={selectedTaskForTimer?.id || ''} 
                    onChange={e => setSelectedTaskForTimer(tasks.find(t => t.id === e.target.value) || null)}
                    className="w-full p-2 border rounded-lg bg-white"
                    disabled={isTimerActive}
                 >
                    <option value="">-- No specific task --</option>
                    {tasks.filter(t => !t.completed).map(task => (
                        <option key={task.id} value={task.id}>{task.text}</option>
                    ))}
                 </select>
            )}
            {selectedTaskForTimer && (
                 <div className="mt-2 text-center p-2 bg-green-100 text-green-800 font-semibold rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle size={16}/> {selectedTaskForTimer.text}
                 </div>
            )}
        </div>

    </div>
  );
};

export default StudyTimerView;