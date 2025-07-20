import React, { useState, useEffect, useRef } from 'react';
import { db, appId, Timestamp, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from '../../../services/firebase';
import type { Note, AppUser, ModalContent } from '../../../types';
import { PlusCircle, Save, Trash2, Edit, NotebookPen, ChevronDown } from 'lucide-react';

interface NotesViewProps {
  userId: string;
  user: AppUser;
  t: (key: string) => string;
  tSubject: (key: string) => string;
  getThemeClasses: (variant: string) => string;
  showAppModal: (content: ModalContent) => void;
}

const CustomDropdown: React.FC<{
    options: { value: string; label: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
    getThemeClasses: (variant: string) => string;
}> = ({ options, selectedValue, onSelect, getThemeClasses }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || 'Select';

    return (
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full sm:w-56 flex items-center justify-between p-2 border rounded-lg bg-white shadow-sm text-left"
            >
                <span className="font-semibold">{selectedLabel}</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-full sm:w-56 bg-white border rounded-lg shadow-lg z-10 animate-fade-in-fast overflow-y-auto max-h-60">
                    {options.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => {
                                onSelect(value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left p-2 hover:bg-gray-100 ${selectedValue === value ? getThemeClasses('text') + ' font-bold' : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
            <style>{`.animate-fade-in-fast { animation: fadeIn 0.1s ease-out; }`}</style>
        </div>
    );
};


const NotesView: React.FC<NotesViewProps> = ({ userId, user, t, tSubject, getThemeClasses, showAppModal }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filterSubject, setFilterSubject] = useState('all');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  
  const userSubjects = React.useMemo(() => {
    const combined = new Set([...(user.selectedSubjects || []), ...(user.customSubjects || [])]);
    return Array.from(combined);
  }, [user.selectedSubjects, user.customSubjects]);

  const dropdownOptions = React.useMemo(() => {
    return [
      { value: 'all', label: t('all_subjects_option') },
      ...userSubjects.map(s => ({ value: s, label: tSubject(s) }))
    ];
  }, [userSubjects, t, tSubject]);
  
  useEffect(() => {
    if (user.uid === 'guest-user') return;
    
    const notesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/notes`);
    let q;

    if (filterSubject === 'all') {
      q = query(notesCollectionRef, orderBy('createdAt', 'desc'));
    } else {
      q = query(notesCollectionRef, where('subject', '==', filterSubject), orderBy('createdAt', 'desc'));
    }
    
    const unsubscribe = onSnapshot(q, snapshot => {
      setNotes(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Note)));
    }, (error) => {
        console.error("Error fetching notes:", error);
        showAppModal({text: "Error fetching notes. Please check the console for details."});
    });

    return () => unsubscribe();
  }, [userId, filterSubject, user.uid, showAppModal]);

  const handleSaveNote = async () => {
    if (user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed') });
        return;
    }
    const title = editingNote ? editingNote.title : newTitle;
    const content = editingNote ? editingNote.content : newContent;
    if (!title.trim()) return showAppModal({ text: t('error_empty_note_title') });

    try {
      if (editingNote) {
        const noteRef = doc(db, `artifacts/${appId}/users/${userId}/notes/${editingNote.id}`);
        await updateDoc(noteRef, { title, content, updatedAt: Timestamp.now() });
        showAppModal({text: t('note_updated_success')});
        setEditingNote(null);
      } else {
        const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/notes`);
        await addDoc(collectionRef, {
          title, content, subject: filterSubject === 'all' ? 'algemeen' : filterSubject, ownerId: userId, createdAt: Timestamp.now()
        });
        showAppModal({text: t('note_added_success')});
        setNewTitle('');
        setNewContent('');
        setIsAdding(false);
      }
    } catch(err) {
      const error = err as Error;
      showAppModal({ text: error.message });
    }
  };
  
  const handleDeleteNote = (id: string) => {
    if (user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed') });
        return;
    }
     showAppModal({
      text: t('confirm_delete_note'),
      confirmAction: async () => {
        const noteRef = doc(db, `artifacts/${appId}/users/${userId}/notes/${id}`);
        await deleteDoc(noteRef);
        showAppModal({ text: t('note_deleted_success') });
        if(editingNote?.id === id) setEditingNote(null);
      },
      cancelAction: () => {}
    });
  }
  
  const handleEditClick = (note: Note) => {
    setEditingNote(JSON.parse(JSON.stringify(note))); // Deep copy to avoid state mutation issues
    setIsAdding(false);
  }

  const handleAddClick = () => {
    setIsAdding(true);
    setEditingNote(null);
    setNewTitle('');
    setNewContent('');
  }

  return (
    <div className={`p-4 rounded-lg shadow-inner ${getThemeClasses('bg-light')} space-y-4`}>
       <div className="flex justify-between items-center flex-wrap gap-2">
            <CustomDropdown
                options={dropdownOptions}
                selectedValue={filterSubject}
                onSelect={setFilterSubject}
                getThemeClasses={getThemeClasses}
            />
            <button onClick={handleAddClick} className={`flex items-center text-white font-bold py-2 px-4 rounded-lg transition-transform active:scale-95 shadow-md ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                <PlusCircle className="w-5 h-5 mr-2"/> {t('add_note_button')}
            </button>
        </div>
        
        {(isAdding || editingNote) && (
          <div className="bg-white p-4 rounded-lg shadow-md space-y-3 animate-fade-in">
            <h3 className="font-bold text-lg">{editingNote ? t('edit_event') : t('add_note_button')}</h3>
            <input type="text" value={editingNote ? editingNote.title : newTitle} onChange={e => editingNote ? setEditingNote({...editingNote, title: e.target.value}) : setNewTitle(e.target.value)} placeholder={t('add_note_title_placeholder')} className="w-full p-2 border rounded-lg"/>
            <textarea value={editingNote ? editingNote.content : newContent} onChange={e => editingNote ? setEditingNote({...editingNote, content: e.target.value}) : setNewContent(e.target.value)} placeholder={t('add_note_content_placeholder')} rows={5} className="w-full p-2 border rounded-lg"/>
            <div className="flex justify-end gap-2">
                <button onClick={() => { setEditingNote(null); setIsAdding(false); }} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95">{t('cancel_button')}</button>
                <button onClick={handleSaveNote} className={`flex items-center gap-2 py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95`}><Save className="w-4 h-4"/>{t('save_note_button')}</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {notes.length === 0 && !isAdding && !editingNote ? (
             <div className="col-span-full text-center py-10 text-gray-500">
                <NotebookPen className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-2 text-lg font-semibold text-gray-700">Je hebt nog geen notities</h3>
                <p className="mt-1 text-sm">Klik op 'Nieuwe Notitie' om te beginnen.</p>
            </div>
          ) : notes.map(note => (
            <div key={note.id} className="bg-yellow-50 p-4 rounded-lg shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between">
              <div className="flex-grow">
                <h4 className="font-bold text-gray-800 break-words">{note.title}</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{note.content}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-yellow-200">
                  <button onClick={() => handleEditClick(note)} className="p-2 text-gray-600 bg-yellow-200 hover:bg-yellow-300 rounded-full transition-colors active:scale-90"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => handleDeleteNote(note.id)} className="p-2 text-gray-600 bg-yellow-200 hover:bg-yellow-300 rounded-full transition-colors active:scale-90"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
};

export default NotesView;