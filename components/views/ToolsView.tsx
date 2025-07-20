


import React, { useState } from 'react';
import { BookOpen, Timer, ListTodo } from 'lucide-react';
import FlashcardsView from './tools/FlashcardsView';
import StudyTimerView from './tools/StudyTimerView';
import ToDoListView from './tools/ToDoListView';

import type { AppUser, ModalContent, ToDoTask } from '../../types';

interface ToolsViewProps {
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  getThemeClasses: (variant: string) => string;
  showAppModal: (content: ModalContent) => void;
  closeAppModal: () => void;
  userId: string;
  user: AppUser;
  tSubject: (key: string) => string;
  copyTextToClipboard: (text: string) => boolean;
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

const ToolsView: React.FC<ToolsViewProps> = (props) => {
  const [activeTool, setActiveTool] = useState('timer');

  const toolComponents: { [key: string]: React.ReactNode } = {
    timer: <StudyTimerView {...props} />,
    todo: <ToDoListView {...props} />,
    flashcards: <FlashcardsView {...props} />,
  };
  
  const toolNavItems = [
      { id: 'timer', label: props.t('study_timer'), icon: <Timer/> },
      { id: 'todo', label: props.t('todo_list'), icon: <ListTodo/> },
      { id: 'flashcards', label: props.t('flashcards'), icon: <BookOpen/> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className={`text-3xl font-bold text-center ${props.getThemeClasses('text-strong')}`}>{props.t('extra_tools')}</h2>
      
      <div className="flex flex-col sm:flex-row justify-center flex-wrap gap-2 p-2 rounded-lg bg-gray-100">
        {toolNavItems.map(item => (
            <button
                key={item.id}
                onClick={() => setActiveTool(item.id)}
                className={`flex items-center justify-center gap-2 py-2 px-4 font-semibold rounded-md transition-colors flex-grow sm:flex-grow-0 ${activeTool === item.id ? `${props.getThemeClasses('bg')} text-white shadow` : 'text-gray-600 hover:bg-gray-200'}`}
            >
                {item.icon} {item.label}
            </button>
        ))}
      </div>

      <div className="mt-4">
        {toolComponents[activeTool]}
      </div>
    </div>
  );
};

export default ToolsView;