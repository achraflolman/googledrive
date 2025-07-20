import React from 'react';

interface CustomModalProps {
  text: string;
  onClose: () => void;
  confirmAction?: () => void;
  cancelAction?: () => void;
  t: (key: string) => string;
  getThemeClasses: (variant: string) => string;
}

const CustomModal: React.FC<CustomModalProps> = ({ text, onClose, confirmAction, cancelAction, t, getThemeClasses }) => {
  const isConfirmModal = confirmAction && cancelAction;

  const handleConfirm = () => {
    if(confirmAction) confirmAction();
    onClose();
  };

  const handleCancel = () => {
    if(cancelAction) cancelAction();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all duration-300 scale-100 animate-scale-up">
        <p className="text-lg font-medium text-gray-800 mb-6 text-center">{text}</p>
        {isConfirmModal ? (
          <div className="flex justify-around space-x-4">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 shadow-lg"
            >
              {t('confirm_button')}
            </button>
            <button
              onClick={handleCancel}
              className={`flex-1 bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-800 font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors duration-200 shadow-lg`}
            >
              {t('cancel_button')}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className={`w-full ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} active:scale-95 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 ${getThemeClasses('ring')} transition-colors duration-200 shadow-lg`}
          >
            {t('close_button')}
          </button>
        )}
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

export default CustomModal;