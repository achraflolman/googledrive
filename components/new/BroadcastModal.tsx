
import React from 'react';
import type { BroadcastData } from '../../types';
import { Megaphone, X } from 'lucide-react';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  broadcast: BroadcastData | null;
  t: (key: string) => string;
  getThemeClasses: (variant: string) => string;
}

const BroadcastModal: React.FC<BroadcastModalProps> = ({ isOpen, onClose, broadcast, t, getThemeClasses }) => {
  if (!isOpen || !broadcast) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full transform transition-all duration-300 scale-100 animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${getThemeClasses('bg-light')}`}>
                    <Megaphone className={`w-6 h-6 ${getThemeClasses('text')}`} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{broadcast.title}</h3>
                    <p className="text-sm text-gray-500">{broadcast.createdAt.toDate().toLocaleString()}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
            </button>
        </div>
        
        <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
          {broadcast.message}
        </div>

        <div className="flex justify-end mt-6">
           <button
            onClick={onClose}
            className={`w-full sm:w-auto ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} active:scale-95 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 ${getThemeClasses('ring')} transition-colors duration-200 shadow-lg`}
          >
            {t('close_button')}
          </button>
        </div>
      </div>
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); } to { transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default BroadcastModal;
