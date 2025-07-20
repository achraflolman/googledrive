
import React, { useState } from 'react';
import { Book, Calendar, BrainCircuit, Rocket, ArrowRight, ArrowLeft, Palette } from 'lucide-react';

interface IntroTutorialViewProps {
    onFinish: () => void;
    t: (key: string) => string;
    getThemeClasses: (variant: string) => string;
}

const IntroTutorialView: React.FC<IntroTutorialViewProps> = ({ onFinish, t, getThemeClasses }) => {
    const [step, setStep] = useState(0);

    const tutorialSteps = [
        {
            icon: <Book className="w-12 h-12" />,
            title: t('intro_step1_title'),
            text: t('intro_step1_text'),
        },
        {
            icon: <Calendar className="w-12 h-12" />,
            title: t('intro_step2_title'),
            text: t('intro_step2_text'),
        },
        {
            icon: <BrainCircuit className="w-12 h-12" />,
            title: t('intro_step3_title'),
            text: t('intro_step3_text'),
        },
        {
            icon: <Palette className="w-12 h-12" />,
            title: t('intro_step4_title'),
            text: t('intro_step4_text'),
        },
        {
            icon: <Rocket className="w-12 h-12" />,
            title: t('intro_step5_title'),
            text: t('intro_step5_text'),
        },
    ];

    const currentStep = tutorialSteps[step];

    const nextStep = () => {
        if (step < tutorialSteps.length - 1) {
            setStep(s => s + 1);
        } else {
            onFinish();
        }
    };
    
    const prevStep = () => {
        if (step > 0) {
            setStep(s => s - 1);
        }
    };

    return (
        <div className={`min-h-screen w-full flex items-center justify-center p-4 animate-fade-in-slow ${getThemeClasses('bg')}`}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full transform transition-all duration-300 scale-100 animate-scale-up text-center flex flex-col justify-between" style={{ minHeight: '420px'}}>
                <div>
                    <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4 ${getThemeClasses('bg-light')}`}>
                        <div className={getThemeClasses('text')}>
                            {currentStep.icon}
                        </div>
                    </div>
                    <h3 className={`text-2xl font-bold mb-3 ${getThemeClasses('text-strong')}`}>{currentStep.title}</h3>
                    <p className="text-gray-600 mb-6">{currentStep.text}</p>
                </div>

                <div>
                    <div className="flex justify-center items-center space-x-2 mb-6">
                        {tutorialSteps.map((_, i) => (
                            <div key={i} onClick={() => setStep(i)} className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${i === step ? getThemeClasses('bg') : 'bg-gray-300'}`}></div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                         {step > 0 ? (
                           <button onClick={prevStep} className="py-3 px-5 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95 flex items-center gap-2">
                               <ArrowLeft size={18}/>
                           </button>
                        ) : <div></div> /* Placeholder to keep next button to the right */}

                        <button onClick={nextStep} className={`py-3 px-5 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95 flex items-center gap-2`}>
                            {step === tutorialSteps.length - 1 ? t('intro_finish_button') : t('next_button')}
                            {step < tutorialSteps.length - 1 && <ArrowRight size={18}/>}
                        </button>
                    </div>
                </div>
            </div>
             <style>{`
                @keyframes scaleUp { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
             `}</style>
        </div>
    );
};

export default IntroTutorialView;