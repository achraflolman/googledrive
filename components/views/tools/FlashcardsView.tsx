
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, appId, Timestamp, increment, collection, query, where, orderBy, onSnapshot, addDoc, doc, deleteDoc, writeBatch, getDocs, updateDoc, limit } from '../../../services/firebase';
import type { Flashcard, FlashcardSet, AppUser, ModalContent } from '../../../types';
import { PlusCircle, Trash2, ArrowLeft, Save, BookOpen, Settings, Brain, BarChart, RotateCcw, X, Check, Loader2, FileQuestion, Star, Layers } from 'lucide-react';

interface FlashcardsViewProps {
  userId: string;
  user: AppUser;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  tSubject: (key: string) => string;
  getThemeClasses: (variant: string) => string;
  showAppModal: (content: ModalContent) => void;
}

type ViewType = 'subjects' | 'sets' | 'mode-selection' | 'manage' | 'learn' | 'cram' | 'mc' | 'summary' | 'all-learned';
interface SessionStats { correct: number; incorrect: number; total: number; }

const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// --- Main Router Component ---
const FlashcardsView: React.FC<FlashcardsViewProps> = (props) => {
  const { user, t, getThemeClasses, tSubject } = props;
  const [view, setView] = useState<ViewType>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [lastSessionStats, setLastSessionStats] = useState<SessionStats | null>(null);
  const [lastSessionMode, setLastSessionMode] = useState<ViewType | null>(null);

  const handleSessionComplete = (stats: SessionStats, mode: ViewType) => {
    setLastSessionStats(stats);
    setLastSessionMode(mode);
    setView('summary');
  };

  const handleSelectSubject = (subject: string) => {
    setSelectedSubject(subject);
    setView('sets');
  };

  const goBack = () => {
    switch (view) {
        case 'summary':
        case 'learn':
        case 'cram':
        case 'mc':
        case 'all-learned':
            setView('mode-selection');
            break;
        case 'mode-selection':
        case 'manage':
            setView('sets');
            break;
        case 'sets':
            setSelectedSubject(null);
            setView('subjects');
            break;
    }
  }

  const userSubjects = useMemo(() => {
    const combined = new Set([...(user.selectedSubjects || []), ...(user.customSubjects || [])]);
    return Array.from(combined);
  }, [user.selectedSubjects, user.customSubjects]);

  const Views: { [key: string]: React.ReactNode } = {
    subjects: (
        <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4`}>
            <h3 className="font-bold text-lg text-center">{t('select_a_subject_first')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {userSubjects.map(s => (
                    <button key={s} onClick={() => handleSelectSubject(s)} className={`p-4 bg-white rounded-lg shadow-md font-semibold hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ${getThemeClasses('text-strong')} focus:outline-none focus:ring-2 ${getThemeClasses('ring')}`}>
                        {tSubject(s)}
                    </button>
                ))}
            </div>
        </div>
    ),
    sets: selectedSubject && <SetSelectionView {...props} selectedSubject={selectedSubject} setSelectedSet={setSelectedSet} setView={setView} onBack={goBack} />,
    'mode-selection': selectedSet && <ModeSelectionView set={selectedSet} setView={setView} onBack={goBack} {...props} />,
    manage: selectedSet && <CardManagerView {...props} set={selectedSet} onBack={goBack} />,
    learn: selectedSet && <LearnSessionView {...props} set={selectedSet} setView={setView} onSessionComplete={handleSessionComplete}/>,
    cram: selectedSet && <CramSessionView {...props} set={selectedSet} setView={setView} onSessionComplete={handleSessionComplete}/>,
    mc: selectedSet && <MultipleChoiceSessionView {...props} set={selectedSet} setView={setView} onSessionComplete={handleSessionComplete}/>,
    summary: selectedSet && lastSessionStats && lastSessionMode && <SessionSummaryView {...props} set={selectedSet} stats={lastSessionStats} setView={setView} onBack={goBack} mode={lastSessionMode}/>,
    'all-learned': selectedSet && <AllCardsLearnedView {...props} set={selectedSet} setView={setView} />
  }

  return <div className="animate-fade-in">{Views[view]}</div>;
};


// --- Sub-Views for Flashcards ---

const SetSelectionView: React.FC<any> = ({ onBack, selectedSubject, setSelectedSet, setView, ...props }) => {
    const { userId, t, tSubject, getThemeClasses, showAppModal, user } = props;
    const [sets, setSets] = useState<FlashcardSet[]>([]);
    const [newSetName, setNewSetName] = useState('');

    useEffect(() => {
        if (!selectedSubject || user.uid === 'guest-user') { setSets([]); return; }
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks`), where('subject', '==', selectedSubject), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            setSets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FlashcardSet)));
        }, (error) => {
            console.error("Error fetching flashcard sets:", error);
            showAppModal({text: t('error_failed_to_load_sets')});
        });
        return () => unsubscribe();
    }, [userId, selectedSubject, user.uid, showAppModal, t]);

    const handleCreateSet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user.uid === 'guest-user') { showAppModal({ text: t('error_guest_action_not_allowed') }); return; }
        if (!newSetName.trim()) { showAppModal({ text: t('error_empty_set_name') }); return; }
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks`), { name: newSetName, subject: selectedSubject, ownerId: userId, createdAt: Timestamp.now(), cardCount: 0 });
        showAppModal({ text: t('set_added_success') });
        setNewSetName('');
    };
    
    const handleDeleteSet = async (set: FlashcardSet) => {
        showAppModal({ text: t('confirm_delete_set', { name: set.name }),
            confirmAction: async () => {
                const batch = writeBatch(db);
                const setRef = doc(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${set.id}`);
                const cardsSnapshot = await getDocs(collection(setRef, 'cards'));
                cardsSnapshot.forEach(cardDoc => batch.delete(cardDoc.ref));
                batch.delete(setRef);
                await batch.commit();
                showAppModal({ text: t('set_deleted_success') });
            },
            cancelAction: () => {}
        });
    };

    return (
        <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4`}>
            <button onClick={onBack} className="font-semibold flex items-center gap-1 hover:underline"><ArrowLeft size={16}/> {t('back_to_subjects_selection')}</button>
            <h3 className="font-bold text-lg text-center">{t('sets_for_subject', { subject: tSubject(selectedSubject) })}</h3>
            <form onSubmit={handleCreateSet} className="bg-white p-3 rounded-lg shadow-sm flex gap-2">
                <input value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder={t('set_name_placeholder')} className="flex-grow p-2 border rounded-lg"/>
                <button type="submit" className={`flex items-center justify-center text-white font-bold p-2 rounded-lg ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} w-12`}><PlusCircle size={20}/></button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sets.length === 0 ? <p className="text-center italic text-gray-500 py-4 md:col-span-2">{t('no_sets_found')}</p> :
                 sets.map(set => (
                    <div key={set.id} onClick={() => { setSelectedSet(set); setView('mode-selection'); }} className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-between cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                        <div>
                            <p className="font-bold text-lg">{set.name}</p>
                            <p className={`text-sm font-semibold ${getThemeClasses('text')}`}>{t('cards_in_set', { count: set.cardCount || 0 })}</p>
                        </div>
                        <div className="flex justify-between items-center mt-4 gap-2">
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteSet(set); }} className="p-2 text-red-500 bg-red-100 hover:bg-red-200 rounded-md transition-colors active:scale-90"><Trash2 className="w-4 h-4"/></button>
                             <button onClick={(e) => { e.stopPropagation(); setSelectedSet(set); setView('manage'); }} className={`flex items-center gap-2 font-semibold text-sm py-2 px-3 rounded-lg transition-colors active:scale-95 bg-gray-200 hover:bg-gray-300`}><Settings size={16}/> {t('manage_cards')}</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ModeSelectionView = ({ onBack, set: currentSet, setView, ...props }: any) => {
    const { getThemeClasses, t, userId, showAppModal } = props;

    const handleResetProgress = () => {
        showAppModal({
            text: t('reset_srs_confirm'),
            confirmAction: async () => {
                const batch = writeBatch(db);
                const cardsRef = collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}/cards`);
                const snapshot = await getDocs(cardsRef);
                snapshot.forEach(cardDoc => {
                    batch.update(cardDoc.ref, {
                        dueDate: Timestamp.now(),
                        interval: 0,
                        easeFactor: 2.5,
                    });
                });
                await batch.commit();
                showAppModal({text: "Progress reset."});
            },
            cancelAction: () => {}
        });
    };

    const studyModes = [
        { id: 'learn', title: t('study_mode_learn_title'), desc: t('study_mode_learn_desc'), icon: <Brain size={32} className={getThemeClasses('text')} /> },
        { id: 'cram', title: t('study_mode_cram_title'), desc: t('study_mode_cram_desc'), icon: <BarChart size={32} className={getThemeClasses('text')} /> },
        { id: 'mc', title: t('study_mode_mc_title'), desc: t('study_mode_mc_desc'), icon: <FileQuestion size={32} className={getThemeClasses('text')} /> },
    ];
    
    return (
      <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4`}>
          <div className="flex justify-between items-center">
            <button onClick={onBack} className="font-semibold flex items-center gap-1 hover:underline"><ArrowLeft size={16}/> {t('back_to_sets')}</button>
            <button onClick={handleResetProgress} className="text-xs font-semibold text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"><RotateCcw size={12}/>{t('reset_srs_progress')}</button>
          </div>
          <h3 className="font-bold text-lg text-center">{t('choose_study_mode')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {studyModes.map(mode => (
                 <div key={mode.id} onClick={() => currentSet.cardCount > 0 ? setView(mode.id) : showAppModal({text: t('no_flashcards_found')})} className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`p-4 rounded-full ${getThemeClasses('bg-light')} mb-4`}>
                      {mode.icon}
                  </div>
                  <h4 className="text-xl font-bold">{mode.title}</h4>
                  <p className="text-gray-600 text-sm mt-2 flex-grow">{mode.desc}</p>
                  <button disabled={currentSet.cardCount === 0} className={`mt-4 w-full font-bold py-2 px-4 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} disabled:opacity-50 disabled:cursor-not-allowed`}>{t('start_session')}</button>
              </div>
              ))}
          </div>
      </div>
    );
};


const CardManagerView = ({ onBack, set: currentSet, ...props }: any) => {
    const { userId, t, getThemeClasses, showAppModal, user } = props;
    const [cardRows, setCardRows] = useState(Array.from({ length: 5 }, () => ({ question: '', answer: '' })));

     const handleSaveCards = async () => {
        if (!currentSet) return;
        if (user.uid === 'guest-user') { showAppModal({ text: t('error_guest_action_not_allowed') }); return; }
        
        const batch = writeBatch(db);
        const setRef = doc(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}`);
        let cardsAddedCount = 0;
        const cardsCollectionRef = collection(setRef, 'cards');

        cardRows.forEach(row => {
            if (row.question.trim() && row.answer.trim()) {
                const cardRef = doc(cardsCollectionRef);
                // Initialize with SRS data
                batch.set(cardRef, { 
                    question: row.question, 
                    answer: row.answer, 
                    ownerId: userId, 
                    createdAt: Timestamp.now(),
                    dueDate: Timestamp.now(), // Due immediately
                    interval: 0,
                    easeFactor: 2.5,
                });
                cardsAddedCount++;
            }
        });

        if (cardsAddedCount > 0) {
            batch.update(setRef, { cardCount: increment(cardsAddedCount) });
            await batch.commit();
            showAppModal({ text: t('flashcard_added_success') });
            setCardRows(Array.from({ length: 5 }, () => ({ question: '', answer: '' })));
        } else {
            showAppModal({ text: t('error_empty_flashcard') });
        }
     };

     const handleRowInputChange = (index: number, field: 'question' | 'answer', value: string) => {
        const newRows = [...cardRows];
        newRows[index][field] = value;
        setCardRows(newRows);
     };

     return (
        <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4`}>
            <button onClick={onBack} className="font-semibold flex items-center gap-1 hover:underline"><ArrowLeft size={16}/> {t('back_to_sets')}</button>
            <h3 className="font-bold text-lg text-center">{t('add_flashcard')} - {currentSet.name}</h3>
            
            <div className="space-y-3">
              {cardRows.map((row, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 items-center bg-white p-2 rounded-lg shadow-sm">
                    <span className="font-semibold text-gray-400 hidden sm:inline">{index + 1}</span>
                    <textarea placeholder={`${t('question')} ${index + 1}`} value={row.question} onChange={e => handleRowInputChange(index, 'question', e.target.value)} className="w-full p-2 border rounded-md" rows={1} />
                    <textarea placeholder={`${t('answer')} ${index + 1}`} value={row.answer} onChange={e => handleRowInputChange(index, 'answer', e.target.value)} className="w-full p-2 border rounded-md" rows={1} />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-4">
                <button onClick={() => setCardRows(prev => [...prev, ...Array.from({ length: 5 }, () => ({ question: '', answer: '' }))])} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95">{t('add_more_rows')}</button>
                <button onClick={handleSaveCards} className={`flex items-center gap-2 py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95`}><Save className="w-5 h-5"/> {t('save_note_button')}</button>
            </div>
        </div>
     );
};


const CramSessionView = ({ set: currentSet, onSessionComplete, ...props }: any) => {
    const { userId, user, t, getThemeClasses, showAppModal, setView } = props;
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user.uid === 'guest-user') { setIsLoading(false); return; }
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}/cards`), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, snapshot => {
            setCards(shuffleArray(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Flashcard))));
            setIsLoading(false);
        }, (error) => {
            showAppModal({text: t('error_failed_to_load_cards')});
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId, currentSet.id, user.uid, showAppModal, t]);

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
             if (currentIndex + 1 >= cards.length) {
                onSessionComplete({ correct: cards.length, incorrect: 0, total: cards.length }, 'cram');
            } else {
                setCurrentIndex(i => i + 1);
            }
        }, 150);
    }
    
    const card = useMemo(() => cards[currentIndex], [cards, currentIndex]);
    
    useEffect(() => {
        setIsFlipped(false);
    }, [card]);

    const progressPercentage = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;
    
    if (isLoading) return <div className="text-center p-8 flex justify-center items-center gap-2"><Loader2 className="animate-spin" /> Loading cards...</div>;
    if (cards.length === 0) return <NoCardsFoundView setView={setView} t={t} getThemeClasses={getThemeClasses} />

    return <StudyCardLayout card={card} isFlipped={isFlipped} setIsFlipped={setIsFlipped} progressPercentage={progressPercentage} set={currentSet} setView={setView} t={t} getThemeClasses={getThemeClasses} cardsRemainingText={`${currentIndex + 1} / ${cards.length}`}>
        <div className="flex justify-center mt-4">
           <button onClick={handleNext} className={`w-full max-w-xs text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                {t('next_card')}
            </button>
        </div>
    </StudyCardLayout>
};

const LearnSessionView = ({ set: currentSet, onSessionComplete, ...props}: any) => {
    const { userId, user, t, getThemeClasses, showAppModal, setView } = props;
    const [dueCards, setDueCards] = useState<Flashcard[]>([]);
    const [sessionQueue, setSessionQueue] = useState<Flashcard[]>([]);
    const [stats, setStats] = useState<SessionStats>({ correct: 0, incorrect: 0, total: 0});
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user.uid === 'guest-user') { setIsLoading(false); return; }
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}/cards`),
            where('dueDate', '<=', Timestamp.now()),
            orderBy('dueDate'),
            limit(20)); // Study in chunks of 20
        const unsubscribe = onSnapshot(q, snapshot => {
            const fetchedCards = shuffleArray(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Flashcard)));
            setDueCards(fetchedCards);
            setSessionQueue(fetchedCards);
            setStats({ correct: 0, incorrect: 0, total: fetchedCards.length });
            setIsLoading(false);
        }, (error) => {
            showAppModal({text: t('error_failed_to_load_cards')});
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId, currentSet.id, user.uid, showAppModal, t]);

    const updateCardSrs = async (card: Flashcard, knewIt: boolean) => {
        const easeFactor = card.easeFactor || 2.5;
        let newInterval;
        let newEaseFactor = easeFactor;

        if (knewIt) {
            if (card.interval === 0 || card.interval === undefined) newInterval = 1;
            else if (card.interval === 1) newInterval = 6;
            else newInterval = Math.ceil(card.interval * easeFactor);
        } else {
            newInterval = 1; // Show again tomorrow
            newEaseFactor = Math.max(1.3, easeFactor - 0.2); // Make it a bit harder
        }
        
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + newInterval);
        
        const cardRef = doc(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}/cards/${card.id}`);
        await updateDoc(cardRef, {
            interval: newInterval,
            easeFactor: newEaseFactor,
            dueDate: Timestamp.fromDate(newDueDate)
        });
    };

    const handleFeedback = async (knewIt: boolean) => {
        if (!card) return;
        
        await updateCardSrs(card, knewIt);
        setStats(s => ({...s, correct: s.correct + (knewIt ? 1 : 0), incorrect: s.incorrect + (knewIt ? 0 : 1)}));

        setIsFlipped(false);
        setTimeout(() => setSessionQueue(prev => prev.slice(1)), 150);
    };

    const card = sessionQueue[0];
    
    useEffect(() => {
        setIsFlipped(false);
    }, [card]);

    const progressPercentage = dueCards.length > 0 ? ((dueCards.length - sessionQueue.length) / dueCards.length) * 100 : 0;

    useEffect(() => {
        if (!isLoading && sessionQueue.length === 0 && dueCards.length > 0) {
            // Check if there are any more due cards in the DB before finishing
            const q = query(collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}/cards`), where('dueDate', '<=', Timestamp.now()), limit(1));
            getDocs(q).then(snapshot => {
                if (snapshot.empty) {
                     setView('all-learned');
                } else {
                    onSessionComplete(stats, 'learn');
                }
            });
        }
    }, [isLoading, sessionQueue.length, dueCards.length, onSessionComplete, stats, setView, userId, currentSet.id]);

    if (isLoading) return <div className="text-center p-8 flex justify-center items-center gap-2"><Loader2 className="animate-spin" /> Loading cards...</div>;
    if (dueCards.length === 0) return <AllCardsLearnedView {...props} set={currentSet} setView={setView} />

    return <StudyCardLayout card={card} isFlipped={isFlipped} setIsFlipped={setIsFlipped} progressPercentage={progressPercentage} set={currentSet} setView={setView} t={t} getThemeClasses={getThemeClasses} cardsRemainingText={t('cards_to_go', {count: sessionQueue.length})} >
         <div className="flex justify-around items-center mt-4">
            {isFlipped ? (
                <>
                    <button onClick={() => handleFeedback(false)} className="flex flex-col items-center gap-1 font-bold text-red-600 bg-red-100 rounded-lg py-3 px-6 transition-transform active:scale-90 hover:bg-red-200">
                        <X size={24} /> {t('feedback_again')}
                    </button>
                    <button onClick={() => handleFeedback(true)} className="flex flex-col items-center gap-1 font-bold text-green-600 bg-green-100 rounded-lg py-3 px-6 transition-transform active:scale-90 hover:bg-green-200">
                        <Check size={24}/> {t('feedback_good')}
                    </button>
                </>
            ) : (
                 <button onClick={() => setIsFlipped(true)} className={`w-full max-w-xs text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                    {t('show_answer')}
                </button>
            )}
        </div>
    </StudyCardLayout>
}

const MultipleChoiceSessionView = ({ set: currentSet, onSessionComplete, ...props }: any) => {
    const { userId, user, t, getThemeClasses, showAppModal, setView } = props;
    const [allCards, setAllCards] = useState<Flashcard[]>([]);
    const [sessionQueue, setSessionQueue] = useState<Flashcard[]>([]);
    const [choices, setChoices] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [stats, setStats] = useState<SessionStats>({ correct: 0, incorrect: 0, total: 0});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user.uid === 'guest-user') { setIsLoading(false); return; }
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}/cards`));
        const unsubscribe = onSnapshot(q, snapshot => {
            const fetchedCards = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Flashcard));
            if (fetchedCards.length < 2) {
                showAppModal({ text: t('error_flashcard_set_min_cards') });
                setView('mode-selection');
                return;
            }
            setAllCards(fetchedCards);
            const shuffledQueue = shuffleArray([...fetchedCards]);
            setSessionQueue(shuffledQueue);
            setStats({ correct: 0, incorrect: 0, total: shuffledQueue.length });
            setIsLoading(false);
        }, (error) => {
            showAppModal({text: t('error_failed_to_load_cards')});
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId, currentSet.id, user.uid, showAppModal, t, setView]);
    
    const card = useMemo(() => sessionQueue[0], [sessionQueue]);

    useEffect(() => {
        if(card && allCards.length > 1) {
            const distractors = shuffleArray(allCards.filter(c => c.id !== card.id))
                .slice(0, 3) // Cap at 3 distractors for a total of 4 choices
                .map(c => c.answer);
            setChoices(shuffleArray([card.answer, ...distractors]));
        }
    }, [card, allCards]);

    const handleAnswer = (answer: string) => {
        if (feedback) return;
        const isCorrect = answer === card.answer;
        setSelectedChoice(answer);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        const newStats = {...stats, correct: stats.correct + (isCorrect ? 1 : 0), incorrect: stats.incorrect + (isCorrect ? 0 : 1)};
        setStats(newStats);

        setTimeout(() => {
            setFeedback(null);
            setSelectedChoice(null);
            if (sessionQueue.length === 1) {
                onSessionComplete(newStats, 'mc');
            } else {
                setSessionQueue(q => q.slice(1));
            }
        }, 1200);
    }
    
    if (isLoading) return <div className="text-center p-8 flex justify-center items-center gap-2"><Loader2 className="animate-spin" /> Loading cards...</div>;
    if (allCards.length < 2) return <NoCardsFoundView setView={setView} t={t} getThemeClasses={getThemeClasses} />;

    return (
        <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4 flex flex-col`}>
             <button onClick={() => setView('mode-selection')} className="font-semibold flex items-center gap-1 hover:underline self-start mb-2"><ArrowLeft size={16}/> {t('back_to_sets')}</button>
             <h3 className="font-bold text-center text-xl">{currentSet.name}</h3>
             <div className="bg-white rounded-lg shadow-lg flex items-center justify-center p-6 text-center h-48">
                <p className="text-2xl font-semibold">{card?.question}</p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {choices.map(choice => {
                    let feedbackClass = `${getThemeClasses('bg')} border-transparent hover:saturate-150`;
                    if (feedback && selectedChoice === choice) {
                        feedbackClass = feedback === 'correct' ? 'bg-green-500 border-green-600' : 'bg-red-500 border-red-600';
                    } else if (feedback && choice === card?.answer) {
                        feedbackClass = 'bg-green-500 border-green-600';
                    } else if (feedback) {
                        feedbackClass = 'bg-gray-400 border-gray-500 opacity-70';
                    }
                    
                    return (
                        <button key={choice} onClick={() => handleAnswer(choice)} disabled={!!feedback}
                            className={`p-4 rounded-lg font-semibold text-white shadow-md border-b-4 transition-all active:scale-95 disabled:cursor-not-allowed ${feedbackClass}`}>
                            {choice}
                        </button>
                    )
                })}
             </div>
        </div>
    );
};

// --- Reusable UI Components for Study Sessions ---

const StudyCardLayout = ({ children, card, isFlipped, setIsFlipped, progressPercentage, set: currentSet, setView, t, getThemeClasses, cardsRemainingText }: any) => {

    useEffect(() => {
        setIsFlipped(false);
    }, [card, setIsFlipped]);

    return (
        <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4 flex flex-col`}>
            <style>{`
                .flip-card { transform-style: preserve-3d; }
                .flip-card-inner { transition: transform 0.6s; transform-style: preserve-3d; }
                .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
                .flip-card-front, .flip-card-back { 
                -webkit-backface-visibility: hidden; backface-visibility: hidden; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                }
                .flip-card-back { transform: rotateY(180deg); }
            `}</style>
            <button onClick={() => setView('mode-selection')} className="font-semibold flex items-center gap-1 hover:underline self-start mb-2"><ArrowLeft size={16}/> {t('back_to_sets')}</button>
            <div className="text-center">
                <h3 className="font-bold text-xl">{currentSet.name}</h3>
                <p className={`font-semibold ${getThemeClasses('text')}`}>{cardsRemainingText}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
                <div className={`${getThemeClasses('bg')} h-2.5 rounded-full transition-all duration-300`} style={{width: `${progressPercentage}%`}}></div>
            </div>
            <div className={`flip-card w-full h-64 sm:h-80 relative ${isFlipped ? 'flipped' : ''}`} style={{ perspective: '1000px' }}>
                <div className="flip-card-inner w-full h-full">
                    <div onClick={() => setIsFlipped(true)} className="flip-card-front bg-white rounded-lg shadow-lg flex items-center justify-center p-6 text-center cursor-pointer">
                        <p className="text-2xl font-semibold">{card?.question}</p>
                    </div>
                    <div onClick={() => setIsFlipped(false)} className={`flip-card-back ${getThemeClasses('bg')} text-white rounded-lg shadow-lg flex items-center justify-center p-6 text-center cursor-pointer`}>
                        <p className="text-xl font-medium">{card?.answer}</p>
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}

const NoCardsFoundView = ({setView, t, getThemeClasses }: any) => (
    <div className={`p-6 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4 text-center`}>
        <BookOpen className={`w-16 h-16 mx-auto ${getThemeClasses('text')}`} />
        <h3 className="font-bold text-lg">{t('no_flashcards_found')}</h3>
        <p className="text-gray-600">Add some cards in the 'Manage Cards' section to start studying.</p>
        <div className="flex justify-center gap-4 mt-4">
             <button onClick={() => setView('sets')} className="font-semibold flex items-center gap-1 hover:underline"><ArrowLeft size={16}/> {t('back_to_sets')}</button>
             <button onClick={() => setView('manage')} className={`flex items-center gap-2 font-semibold text-sm py-2 px-3 rounded-lg transition-colors active:scale-95 text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}><Settings size={16}/> {t('manage_cards')}</button>
        </div>
    </div>
);

const AllCardsLearnedView = ({ set: currentSet, setView, ...props }: any) => {
    const { userId, t, getThemeClasses } = props;

    const handleResetProgressAndRestart = async () => {
        const batch = writeBatch(db);
        const cardsRef = collection(db, `artifacts/${appId}/users/${userId}/flashcardDecks/${currentSet.id}/cards`);
        const snapshot = await getDocs(cardsRef);
        snapshot.forEach(cardDoc => {
            batch.update(cardDoc.ref, {
                dueDate: Timestamp.now(),
                interval: 0,
                easeFactor: 2.5,
            });
        });
        await batch.commit();
        setView('learn'); // Restart the learn session
    };

    return (
        <div className={`p-6 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4 text-center`}>
            <Check className={`w-16 h-16 mx-auto ${getThemeClasses('text')}`} />
            <h3 className="font-bold text-lg">{t('all_cards_learned_title')}</h3>
            <p className="text-gray-600">{t('all_cards_learned_desc')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                 <button onClick={() => setView('mode-selection')} className={`w-full sm:w-auto font-bold py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors active:scale-95 flex items-center justify-center gap-2`}>
                    <Layers size={16}/> {t('choose_other_method_button')}
                </button>
                 <button onClick={handleResetProgressAndRestart} className={`w-full sm:w-auto font-bold py-2 px-4 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95 flex items-center justify-center gap-2`}>
                    <RotateCcw size={16}/> {t('reset_and_start_over_button')}
                </button>
            </div>
        </div>
    );
};

const SessionSummaryView = ({ setView, t, getThemeClasses, stats, mode }: any) => {
    const handleStudyAgain = () => {
         setView(mode);
    }
    return (
     <div className={`p-6 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4 text-center flex flex-col items-center justify-center`}>
        <Star className={`w-20 h-20 mx-auto text-amber-400`} />
        <h3 className="font-bold text-2xl">{t('session_complete')}</h3>
        <p className="text-xl font-semibold">{t('your_score', { correct: stats.correct, total: stats.total })}</p>
        <p className="text-gray-600">{t('well_done_message')}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4 w-full max-w-sm">
             <button onClick={() => setView('mode-selection')} className={`w-full font-bold py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors active:scale-95`}>
                {t('choose_other_method_button')}
            </button>
            <button onClick={handleStudyAgain} className={`w-full font-bold py-2 px-4 rounded-lg text-white ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95`}>
                {t('study_again_button')}
            </button>
        </div>
    </div>
    );
};

export default FlashcardsView;
