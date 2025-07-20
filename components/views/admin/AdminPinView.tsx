
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Delete, KeyRound } from 'lucide-react';
import type { AppUser } from '../../../types';

interface AdminPinViewProps {
  user: AppUser;
  onSuccess: () => void;
  t: (key: string) => string;
  getThemeClasses: (variant: string) => string;
}

const AdminPinView: React.FC<AdminPinViewProps> = ({ user, onSuccess, t, getThemeClasses }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const CORRECT_PIN = '0999';

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => {
          setError(false);
          setPin('');
        }, 800);
      }
    }
  }, [pin, onSuccess]);

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };
  
  const pinDots = Array.from({ length: 4 }).map((_, index) => (
    <div
      key={index}
      className={`w-4 h-4 rounded-full transition-all duration-200 ${
        pin.length > index ? 'bg-white' : 'bg-white/30'
      } ${error ? 'animate-shake' : ''}`}
    />
  ));

  const NumPadButton: React.FC<{ value: string | React.ReactNode, onClick: () => void }> = ({ value, onClick }) => (
      <button
        onClick={onClick}
        className="text-3xl font-light text-white rounded-full h-16 w-16 flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 active:scale-90 shadow-lg"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}
      >
        {value}
      </button>
  );

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 bg-emerald-600 animate-fade-in-slow`}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
      <div className="bg-emerald-500/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center text-white animate-fade-in">
        <img src={user.profilePictureUrl} alt="Admin" className="w-20 h-20 mx-auto rounded-full border-4 border-white/20 shadow-lg mb-3"/>
        <h2 className="text-2xl font-bold">Admin Verification</h2>
        <p className="text-white/70 mb-6">Please enter your security PIN.</p>
        <div className="flex justify-center items-center gap-4 mb-8">
            {pinDots}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {'123456789'.split('').map(num => <NumPadButton key={num} value={num} onClick={() => handlePinInput(num)} />)}
          <div className="flex items-center justify-center">
            <KeyRound size={28} className="text-white/30" />
          </div>
          <NumPadButton value="0" onClick={() => handlePinInput('0')} />
          <NumPadButton value={<Delete size={28}/>} onClick={handleBackspace} />
        </div>
      </div>
    </div>
  );
};

export default AdminPinView;
