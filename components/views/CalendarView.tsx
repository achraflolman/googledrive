import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { db, appId, Timestamp, doc, updateDoc, addDoc, collection, deleteDoc } from '../../services/firebase';
import type { CalendarEvent, AppUser, ModalContent } from '../../types';

interface CalendarViewProps {
  userEvents: CalendarEvent[];
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  getThemeClasses: (variant: string) => string;
  tSubject: (key: string) => string;
  language: string;
  showAppModal: (content: ModalContent) => void;
  userId: string;
  user: AppUser;
}

// Helper to get a YYYY-MM-DD string from a Date object in its local timezone
const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const CalendarView: React.FC<CalendarViewProps> = ({ userEvents, t, getThemeClasses, tSubject, language, showAppModal, userId, user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);


  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'test' | 'presentation' | 'homework' | 'oral' | 'other'>('test');
  const [subject, setSubject] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const availableSubjects = useMemo(() => {
    const combined = new Set([...(user.selectedSubjects || []), ...(user.customSubjects || [])]);
    return Array.from(combined);
  }, [user.selectedSubjects, user.customSubjects]);
  
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }, []);

  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const newDate = new Date(d.getFullYear(), d.getMonth(), diff);
    newDate.setHours(0,0,0,0);
    return newDate;
  }, [currentDate]);

  const daysOfWeek = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
    }
    return days;
  }, [startOfWeek]);
  
  const eventsByDay = useMemo(() => {
    const eventsMap = new Map<string, CalendarEvent[]>();
    userEvents.forEach(event => {
        if (event.start && event.start.toDate) {
            const dateStr = toLocalDateString(event.start.toDate());
            if (!eventsMap.has(dateStr)) {
                eventsMap.set(dateStr, []);
            }
            eventsMap.get(dateStr)!.push(event);
        }
    });
    return eventsMap;
  }, [userEvents]);

  const openModal = (eventToEdit: CalendarEvent | null, dateForNew: Date | null = null) => {
    if (eventToEdit) {
        setEditingEvent(eventToEdit);
        setTitle(eventToEdit.title);
        setDescription(eventToEdit.description || '');
        setType(eventToEdit.type);
        setSubject(eventToEdit.subject);
        const startDate = eventToEdit.start.toDate();
        setEventDate(toLocalDateString(startDate));
        setStartTime(startDate.toTimeString().substring(0, 5));
        setEndTime(eventToEdit.end.toDate().toTimeString().substring(0, 5));
    } else {
        setEditingEvent(null);
        setTitle('');
        setDescription('');
        setType('test');
        setSubject(availableSubjects[0] || '');
        const initialDate = dateForNew || new Date();
        setEventDate(toLocalDateString(initialDate));
        setStartTime('09:00');
        setEndTime('10:00');
    }
    setIsModalOpen(true);
  };
  
  const handleSaveEvent = async () => {
    if (user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed') });
        return;
    }
    if (!title.trim() || !subject || !eventDate || !startTime || !endTime) {
        showAppModal({ text: t('error_fill_all_fields') });
        return;
    }

    setIsSaving(true);
    const startDateTime = new Date(`${eventDate}T${startTime}`);
    const endDateTime = new Date(`${eventDate}T${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        showAppModal({ text: 'Invalid date or time.' });
        setIsSaving(false);
        return;
    }

    const eventData = {
        title,
        description,
        type,
        subject,
        start: Timestamp.fromDate(startDateTime),
        end: Timestamp.fromDate(endDateTime),
        ownerId: userId,
    };
    
    try {
        if (editingEvent) {
            const eventRef = doc(db, `artifacts/${appId}/users/${userId}/calendarEvents/${editingEvent.id}`);
            await updateDoc(eventRef, { ...eventData, updatedAt: Timestamp.now() });
            showAppModal({ text: t('success_event_updated') });
        } else {
            const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/calendarEvents`);
            await addDoc(collectionRef, { ...eventData, createdAt: Timestamp.now() });
            showAppModal({ text: t('success_event_added') });
        }
        setIsModalOpen(false);
    } catch (error) {
        const err = error as Error;
        showAppModal({ text: `Error saving event: ${err.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    if (user.uid === 'guest-user') {
        showAppModal({ text: t('error_guest_action_not_allowed') });
        return;
    }
    showAppModal({
        text: t('delete_event_confirm', { title: event.title }),
        confirmAction: async () => {
            try {
                const eventRef = doc(db, `artifacts/${appId}/users/${userId}/calendarEvents/${event.id}`);
                await deleteDoc(eventRef);
            } catch (error) {
                const err = error as Error;
                showAppModal({ text: `Error deleting event: ${err.message}` });
            }
        },
        cancelAction: () => {}
    });
  };

  const selectedDayEvents = (eventsByDay.get(toLocalDateString(selectedDate)) || []).sort((a,b) => a.start.toMillis() - b.start.toMillis());
  const isSelectedDateToday = selectedDate.toDateString() === today.toDateString();

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      <h2 className={`text-3xl font-bold text-center ${getThemeClasses('text-strong')}`}>{t('calendar_title')}</h2>
      
      <div className={`p-4 rounded-xl shadow-lg ${getThemeClasses('bg-light')}`}>
        <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)))} className="p-2 rounded-full hover:bg-gray-200 transition-colors active:scale-90"><ChevronLeft/></button>
            <h3 className="text-lg font-semibold">{startOfWeek.toLocaleDateString(language, { month: 'long', year: 'numeric' })}</h3>
            <button type="button" onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)))} className="p-2 rounded-full hover:bg-gray-200 transition-colors active:scale-90"><ChevronRight/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
            {daysOfWeek.map(day => {
                const isToday = day.getTime() === today.getTime();
                const isSelected = day.toDateString() === selectedDate.toDateString();
                const dateStr = toLocalDateString(day);
                return (
                    <div key={day.toISOString()} onClick={() => setSelectedDate(day)}
                        className={`p-1 sm:p-2 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? `${getThemeClasses('bg')} text-white shadow-md` : 'hover:bg-gray-100'} ${isToday && !isSelected ? `border-2 ${getThemeClasses('border')}`:''}`}>
                        <div className="text-xs font-bold">{day.toLocaleDateString(language, { weekday: 'short' })}</div>
                        <div className="text-base sm:text-lg">{day.getDate()}</div>
                        {eventsByDay.has(dateStr) && <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${isSelected ? 'bg-white' : getThemeClasses('bg')}`}></div>}
                    </div>
                );
            })}
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
                {isSelectedDateToday && <span className={`text-sm font-semibold align-middle p-1 px-2 rounded-md ${getThemeClasses('bg')} text-white`}>{t('today')}</span>}
                {selectedDate.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button type="button" onClick={() => openModal(null, selectedDate)} className={`flex items-center text-white font-bold py-2 px-4 rounded-lg transition-transform active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                <PlusCircle className="w-5 h-5 mr-2"/> {t('add_event')}
            </button>
        </div>

        {userEvents.length === 0 && selectedDayEvents.length === 0 ? (
            <p className="text-center text-gray-500 italic py-4">{t('no_events_day')}</p>
        ) : selectedDayEvents.length === 0 ? (
             <p className="text-center text-gray-500 italic py-4">{t('no_events_day')}</p>
        ) : (
            <ul className="space-y-3">
            {selectedDayEvents.map(event => (
                <li key={event.id} onClick={() => setViewingEvent(event)} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-start transition-shadow hover:shadow-md cursor-pointer">
                    <div>
                        <p className="font-bold">{event.title} <span className="text-sm font-normal text-gray-500">({tSubject(event.subject)})</span></p>
                        <p className={`text-sm font-semibold ${getThemeClasses('text')}`}>{event.start.toDate().toLocaleTimeString(language, {hour: '2-digit', minute:'2-digit'})} - {event.end.toDate().toLocaleTimeString(language, {hour: '2-digit', minute:'2-digit'})}</p>
                        {event.description && <p className="text-sm text-gray-500 mt-1 truncate">{event.description}</p>}
                    </div>
                    <div className="flex gap-2">
                         <button type="button" onClick={(e) => { e.stopPropagation(); openModal(event, null); }} className="p-2 text-white bg-yellow-400 hover:bg-yellow-500 rounded-md transition-colors active:scale-90"><Edit className="w-4 h-4"/></button>
                         <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event); }} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors active:scale-90"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </li>
            ))}
            </ul>
        )}
      </div>
    </div>
    
      {isModalOpen && (
          <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold">{editingEvent ? t('edit_event') : t('add_event')}</h3>
                  <input type="text" placeholder={t('event_title')} value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg" required />
                  <textarea placeholder={t('event_description')} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg" />
                  <div className="grid grid-cols-2 gap-4">
                      <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border rounded-lg bg-white" required>
                          <option value="test">{t('event_test')}</option>
                          <option value="presentation">{t('event_presentation')}</option>
                          <option value="homework">{t('event_homework')}</option>
                          <option value="oral">{t('event_oral')}</option>
                          <option value="other">{t('event_other')}</option>
                      </select>
                      <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border rounded-lg bg-white" required>
                          <option value="">Select Subject</option>
                          {availableSubjects.map(s => <option key={s} value={s}>{tSubject(s)}</option>)}
                      </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full p-2 border rounded-lg col-span-1" required />
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded-lg col-span-1" required />
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded-lg col-span-1" required />
                  </div>
                  <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95">{t('cancel_button')}</button>
                      <button type="button" onClick={handleSaveEvent} disabled={isSaving} className={`py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95 w-36 flex justify-center items-center`}>
                         {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            editingEvent ? t('save_note_button') : t('add_event_button')
                        )}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {viewingEvent && (
        <div onClick={() => setViewingEvent(null)} className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold">{viewingEvent.title}</h3>
                <p><span className="font-semibold">{t('event_subject')}:</span> {tSubject(viewingEvent.subject)}</p>
                <p><span className="font-semibold">{t('event_type')}:</span> {t(`event_${viewingEvent.type}`)}</p>
                <p><span className="font-semibold">Tijd:</span> {viewingEvent.start.toDate().toLocaleTimeString(language, {hour: '2-digit', minute:'2-digit'})} - {viewingEvent.end.toDate().toLocaleTimeString(language, {hour: '2-digit', minute:'2-digit'})}</p>
                {viewingEvent.description && (
                    <div>
                        <p className="font-semibold">{t('event_description')}:</p>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-md mt-1">{viewingEvent.description}</p>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setViewingEvent(null)} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition-colors active:scale-95">{t('close_button')}</button>
                    <button type="button" onClick={() => { openModal(viewingEvent, null); setViewingEvent(null); }} className={`flex items-center gap-2 py-2 px-4 rounded-lg text-white font-bold ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} transition-colors active:scale-95`}>
                      <Edit className="w-4 h-4" /> {t('edit_event')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default CalendarView;