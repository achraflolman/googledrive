import React, { useState, useCallback } from 'react';
import {
    auth, db, appId, Timestamp,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    setDoc,
    doc
} from '../../services/firebase';
import { allSubjects, educationLevels } from '../../constants';
import type { ModalContent } from '../../types';

interface AuthViewProps {
  showAppModal: (content: ModalContent) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  getThemeClasses: (variant: string) => string;
  tSubject: (key: string) => string;
}

const FormInput = ({ name, label, type, value, onChange, placeholder, required = true, disabled = false, getThemeClasses }: any) => (
    <div>
        <label className="block text-gray-800 text-sm font-bold mb-2">{label}</label>
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} disabled={disabled}
            className={`shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 ${getThemeClasses('ring')} transition-all duration-200 disabled:bg-gray-100`} />
    </div>
);

const StepIndicator = ({ count, current, getThemeClasses }: { count: number, current: number, getThemeClasses: (v: string) => string }) => (
    <div className="flex justify-center items-center space-x-2 my-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${i + 1 === current ? getThemeClasses('bg') : 'bg-gray-300'}`}></div>
        ))}
    </div>
);

const AuthView: React.FC<AuthViewProps> = ({ showAppModal, t, getThemeClasses, tSubject }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
      email: '',
      password: '',
      regName: '',
      regSchoolName: '',
      regClassName: '',
      regEducationLevel: '',
      regLanguage: 'nl',
  });
  const [selectedRegSubjects, setSelectedRegSubjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({...prev, [name]: value}));
  }, []);

    const handleAuthError = (errorCode: string) => {
        let key = 'error_unknown';
        switch (errorCode) {
            case 'auth/invalid-email': key = 'error_invalid_email'; break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': key = 'error_invalid_credentials'; break;
            case 'auth/email-already-in-use': key = 'error_email_in_use'; break;
            case 'auth/weak-password': key = 'error_weak_password'; break;
            default: console.error("Firebase Auth Error:", errorCode);
        }
        showAppModal({ text: t(key) });
    };
    
    const validateStep = () => {
        if (step === 1) {
            if (!formData.regName || !formData.email || !formData.password) {
                 showAppModal({ text: t('error_fill_current_step') });
                 return false;
            }
             if (formData.password.length < 6) {
                showAppModal({ text: t('error_weak_password') });
                return false;
            }
        }
        if (step === 2) {
             if (!formData.regSchoolName || !formData.regClassName || !formData.regEducationLevel) {
                 showAppModal({ text: t('error_fill_current_step') });
                 return false;
            }
        }
        if (step === 3) {
            if (selectedRegSubjects.length === 0) {
                showAppModal({ text: t('error_select_subjects_register') });
                return false;
            }
        }
        return true;
    };
    
    const nextStep = () => {
        if (validateStep()) {
            setStep(s => s + 1);
        }
    }
    const prevStep = () => setStep(s => s - 1);


  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isRegister) {
      if (!validateStep()) {
          setIsSubmitting(false);
          return;
      }
      const { email, password, regName, regSchoolName, regClassName, regEducationLevel, regLanguage } = formData;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
            await sendEmailVerification(userCredential.user);
        }
        
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${userCredential.user!.uid}`);
        await setDoc(userDocRef, {
          uid: userCredential.user!.uid,
          email,
          userName: regName,
          profilePictureUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(regName)}&background=random&color=fff&size=128`,
          createdAt: Timestamp.now(),
          selectedSubjects: selectedRegSubjects,
          schoolName: regSchoolName,
          className: regClassName,
          educationLevel: regEducationLevel,
          languagePreference: regLanguage,
          themePreference: 'emerald',
          streakCount: 1,
          lastLoginDate: Timestamp.now(),
          notificationsEnabled: true,
          disabled: false,
          isVerifiedByEmail: false,
        });
        showAppModal({ text: t('success_registration') });
        // onAuthStateChanged will handle view change to verification screen
      } catch (error: any) {
        handleAuthError(error.code);
        setIsSubmitting(false);
      }
    } else { // Login
      const { email, password } = formData;
      if (!email || !password) {
          showAppModal({ text: t('error_fill_all_fields') });
          setIsSubmitting(false);
          return;
      }
      try {
        await signInWithEmailAndPassword(auth, email, password);
         // onAuthStateChanged will handle view change.
      } catch (error: any) {
        handleAuthError(error.code);
        setIsSubmitting(false);
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      showAppModal({ text: t('error_enter_email_for_reset') });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, formData.email);
      showAppModal({ text: t('password_reset_sent', { email: formData.email }) });
    } catch (error: any) {
      handleAuthError(error.code);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedRegSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };
  
  const renderRegisterForm = () => (
    <form onSubmit={handleAuthAction} className="space-y-5">
        <StepIndicator count={3} current={step} getThemeClasses={getThemeClasses} />
        {step === 1 && (
            <div className="space-y-5 animate-fade-in">
                <FormInput name="regName" label={t('your_name')} type="text" value={formData.regName} onChange={handleInputChange} placeholder={t('placeholder_name')} disabled={isSubmitting} getThemeClasses={getThemeClasses}/>
                <FormInput name="email" label={t('email_address')} type="email" value={formData.email} onChange={handleInputChange} placeholder={t('placeholder_email')} disabled={isSubmitting} getThemeClasses={getThemeClasses}/>
                <FormInput name="password" label={t('password')} type="password" value={formData.password} onChange={handleInputChange} placeholder={t('placeholder_password')} disabled={isSubmitting} getThemeClasses={getThemeClasses}/>
            </div>
        )}
        {step === 2 && (
             <div className="space-y-5 animate-fade-in">
                <FormInput name="regSchoolName" label={t('school_name')} type="text" value={formData.regSchoolName} onChange={handleInputChange} placeholder={t('school_name')} disabled={isSubmitting} getThemeClasses={getThemeClasses}/>
                <FormInput name="regClassName" label={t('class_name')} type="text" value={formData.regClassName} onChange={handleInputChange} placeholder={t('class_name')} disabled={isSubmitting} getThemeClasses={getThemeClasses}/>
                <div>
                  <label className="block text-gray-800 text-sm font-bold mb-2">{t('education_level')}</label>
                  <select name="regEducationLevel" value={formData.regEducationLevel} onChange={handleInputChange} required disabled={isSubmitting}
                      className={`shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 ${getThemeClasses('ring')} transition-all duration-200 bg-white disabled:bg-gray-100`}>
                      <option value="">{t('select_level')}</option>
                      {educationLevels.map(level => <option key={level} value={level}>{tSubject(level)}</option>)}
                  </select>
                </div>
            </div>
        )}
        {step === 3 && (
            <div className="space-y-2 animate-fade-in">
                <label className="block text-gray-800 text-sm font-bold">{t('select_subjects')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                    {allSubjects.map(subject => (
                        <button type="button" key={subject} onClick={() => handleSubjectToggle(subject)} disabled={isSubmitting}
                            className={`p-2 text-sm font-semibold rounded-md transition-all duration-200 border-2 active:scale-95 disabled:opacity-50 ${selectedRegSubjects.includes(subject) ? `${getThemeClasses('bg')} text-white border-transparent shadow-sm` : 'bg-white hover:bg-gray-200 border-gray-100'}`}>
                            {tSubject(subject)}
                        </button>
                    ))}
                </div>
            </div>
        )}
        <div className="pt-2 flex justify-between items-center space-x-2">
            {step > 1 && <button type="button" onClick={prevStep} disabled={isSubmitting} className="font-semibold py-3 px-4 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all duration-200">{t('back_button')}</button>}
            {step < 3 ? (
                <button type="button" onClick={nextStep} disabled={isSubmitting} className={`w-full font-bold py-3 px-4 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                    {t('next_button')}
                </button>
            ) : (
                <button type="submit" disabled={isSubmitting} className={`w-full font-bold py-3 px-4 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} shadow-lg hover:shadow-xl transition-all duration-200 transform active:scale-[.97] disabled:opacity-70 disabled:cursor-not-allowed`}>
                    {isSubmitting ? t('saving') : t('register_account')}
                </button>
            )}
        </div>
    </form>
  );

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 animate-fade-in-slow`}>
      <div className="w-full max-w-md">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
          <h2 className={`text-3xl font-bold text-center mb-2 ${getThemeClasses('text-strong')}`}>
            {isRegister ? t('register_title') : t('login_title')}
          </h2>
          
          {isRegister ? renderRegisterForm() : (
            <form onSubmit={handleAuthAction} className="space-y-5">
              <FormInput name="email" label={t('email_address')} type="email" value={formData.email} onChange={handleInputChange} placeholder={t('placeholder_email')} disabled={isSubmitting} getThemeClasses={getThemeClasses}/>
              <FormInput name="password" label={t('password')} type="password" value={formData.password} onChange={handleInputChange} placeholder={t('placeholder_password')} disabled={isSubmitting} getThemeClasses={getThemeClasses}/>
               <div className="pt-2">
                 <button type="submit" disabled={isSubmitting} className={`w-full font-bold py-3 px-4 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} shadow-lg hover:shadow-xl transition-all duration-200 transform active:scale-[.98] disabled:opacity-70 disabled:cursor-not-allowed`}>
                    {isSubmitting ? t('saving') : t('login_button')}
                 </button>
               </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <button type="button" disabled={isSubmitting} onClick={() => { setIsRegister(!isRegister); setStep(1); }} className="w-full text-center py-3 px-4 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-all duration-200 transform active:scale-[.98] shadow-sm disabled:opacity-70">
                {isRegister ? t('already_account') : t('no_account_register')}
            </button>
            {!isRegister && (
              <button onClick={handlePasswordReset} className="text-sm font-semibold text-gray-500 hover:underline mt-4 inline-block">
                {t('forgot_password')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;