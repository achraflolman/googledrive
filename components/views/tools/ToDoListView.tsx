import React, { useState, useEffect } from 'react';
import { db, appId, Timestamp, collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from '../../../services/firebase';
import type { ToDoTask, AppUser, ModalContent } from '../../../types';
import { PlusCircle, Trash2 } from 'lucide-react';

interface ToDoListViewProps {
  userId: string;
  user: AppUser;
  t: (key: string) => string;
  getThemeClasses: (variant: string) => string;
  showAppModal: (content: ModalContent) => void;
}

const ToDoListView: React.FC<ToDoListViewProps> = ({ userId, user, t, getThemeClasses, showAppModal }) => {
  const [tasks, setTasks] = useState<ToDoTask[]>([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    if (user.uid === 'guest-user') {
        setTasks([]);
        return;
    }
    const q = query(collection(db, `artifacts/${appId}/users/${userId}/tasks`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setTasks(snapshot.docs.map(d => ({id: d.id, ...d.data()} as ToDoTask)));
    }, (error) => {
        console.error("Error fetching to-do tasks:", error);
        showAppModal({text: t('error_failed_to_load_tasks')});
    });
    return () => unsubscribe();
  }, [userId, user.uid, showAppModal, t]);
  
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed') });
        return;
    }
    if(!newTask.trim()) return showAppModal({text: t('error_empty_task')});
    await addDoc(collection(db, `artifacts/${appId}/users/${userId}/tasks`), {
        text: newTask,
        completed: false,
        ownerId: userId,
        createdAt: Timestamp.now()
    });
    setNewTask('');
    showAppModal({text: t('task_added_success')});
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    if (user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed') });
        return;
    }
    await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/tasks/${id}`), { completed: !completed });
    showAppModal({text: t('task_updated_success')});
  };
  
  const handleDeleteTask = (id: string) => {
    if (user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed') });
        return;
    }
    showAppModal({
      text: t('confirm_delete_task'),
      confirmAction: async () => {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/tasks/${id}`));
        showAppModal({text: t('task_deleted_success')});
      },
      cancelAction: () => {}
    });
  };

  return (
    <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4`}>
        <form onSubmit={handleAddTask} className="flex gap-2">
            <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder={t('add_task_placeholder')} className="flex-grow p-2 border rounded-lg"/>
            <button type="submit" className={`flex items-center text-white font-bold py-2 px-4 rounded-lg transition-transform active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                <PlusCircle className="w-5 h-5 mr-2"/> {t('add_task_button')}
            </button>
        </form>
        <div className="space-y-2">
            {tasks.length === 0 ? (
                <p className="text-center italic text-gray-500 py-4">{t('no_tasks_found')}</p>
            ) : (
                tasks.map(task => (
                    <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between transition-shadow hover:shadow-md">
                        <label className="flex items-center gap-3 cursor-pointer w-full">
                            <input type="checkbox" checked={task.completed} onChange={() => handleToggleTask(task.id, task.completed)} className={`form-checkbox h-5 w-5 rounded transition-colors ${getThemeClasses('text')} focus:ring-0`}/>
                            <span className={`flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.text}</span>
                        </label>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors active:scale-90 flex-shrink-0"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default ToDoListView;