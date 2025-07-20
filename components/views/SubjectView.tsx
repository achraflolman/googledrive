


import React, { useState } from 'react';
import { ChevronLeft, Share2, PlusCircle, Trash2, Link, Search, XCircle, LoaderCircle } from 'lucide-react';
import { uploadFileToDrive, deleteFileFromDrive } from '../../services/firebase';
import type { FileData, ModalContent, AppUser } from '../../types';

interface SubjectViewProps {
    user: AppUser;
    currentSubject: string;
    subjectFiles: FileData[];
    setCurrentSubject: (subject: string | null) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
    tSubject: (key: string) => string;
    getThemeClasses: (variant: string) => string;
    showAppModal: (content: ModalContent) => void;
    userId: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    copyTextToClipboard: (text: string, title?: string) => boolean;
}

const SubjectView: React.FC<SubjectViewProps> = ({ user, currentSubject, subjectFiles, setCurrentSubject, t, tSubject, getThemeClasses, showAppModal, userId, searchQuery, setSearchQuery, copyTextToClipboard }) => {
    const [newFileTitle, setNewFileTitle] = useState('');
    const [newFileDescription, setNewFileDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleAddFile = async () => {
        if (!user.isDriveConnected) {
            showAppModal({ text: 'Koppel eerst je Google Drive account in de instellingen.' });
            return;
        }
        if (!newFileTitle.trim()) return showAppModal({ text: t('error_enter_file_title') });
        if (!selectedFile) return showAppModal({ text: t('error_select_file_to_upload') });

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];
                
                await uploadFileToDrive({
                    fileContent: base64String,
                    fileName: selectedFile.name,
                    fileType: selectedFile.type,
                    title: newFileTitle,
                    description: newFileDescription,
                    subject: currentSubject,
                });

                showAppModal({ text: t('success_file_added') });
                setNewFileTitle('');
                setNewFileDescription('');
                setSelectedFile(null);
                const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
                if (fileInput) fileInput.value = '';
                setIsUploading(false);
            };
            reader.onerror = () => {
                 showAppModal({ text: "Fout bij het lezen van het bestand." });
                 setIsUploading(false);
            };

        } catch (error) {
            const err = error as Error;
            showAppModal({ text: t('error_add_file_failed', { message: err.message }) });
            setIsUploading(false);
        }
    };

    const handleDeleteFiles = async () => {
        if (selectedFileIds.length === 0) return showAppModal({ text: t('error_select_files_delete') });

        showAppModal({
            text: t('confirm_delete_files', { count: selectedFileIds.length }),
            confirmAction: async () => {
                try {
                    const deletePromises = selectedFileIds.map(fileId => {
                        const fileToDelete = subjectFiles.find(f => f.id === fileId);
                        if (fileToDelete?.driveFileId) {
                            return deleteFileFromDrive({ fileId: fileToDelete.id, driveFileId: fileToDelete.driveFileId });
                        }
                        return Promise.reject(`Bestand ${fileId} heeft geen driveFileId.`);
                    });
                    
                    await Promise.all(deletePromises);
                    
                    showAppModal({ text: t('success_files_deleted') });
                    setSelectedFileIds([]);
                    setIsSelecting(false);
                } catch (error) {
                    const err = error as Error;
                    showAppModal({ text: t('error_delete_file_failed', { message: err.message }) });
                }
            },
            cancelAction: () => {}
        });
    };
    
    const toggleFileSelection = (id: string) => {
        setSelectedFileIds(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <button onClick={() => setCurrentSubject(null)} className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors active:scale-95">
                    <ChevronLeft className="w-4 h-4 mr-2" /> {t('back_to_subjects')}
                </button>
                <h2 className={`text-2xl font-bold ${getThemeClasses('text-strong')}`}>{tSubject(currentSubject)}</h2>
                 <button onClick={() => copyTextToClipboard(window.location.href, tSubject(currentSubject))} className={`flex items-center text-white font-semibold py-2 px-4 rounded-lg transition-colors active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>
                    <Share2 className="w-4 h-4 mr-2" /> {t('share_button')}
                </button>
            </div>
            
            {!user.isDriveConnected && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg" role="alert">
                    <p className="font-bold">Google Drive niet gekoppeld</p>
                    <p>Om bestanden te kunnen uploaden, moet je eerst je Google Drive account koppelen in de instellingen.</p>
                </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
                <h3 className="font-bold text-lg mb-2">{t('add_file_section_title')}</h3>
                <input type="text" placeholder={t('file_title_placeholder')} value={newFileTitle} onChange={e => setNewFileTitle(e.target.value)} className="w-full p-2 border rounded-lg" disabled={isUploading || !user.isDriveConnected}/>
                <textarea placeholder={t('file_description_placeholder')} value={newFileDescription} onChange={e => setNewFileDescription(e.target.value)} className="w-full p-2 border rounded-lg" disabled={isUploading || !user.isDriveConnected}/>
                <input id="file-input" type="file" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100" disabled={isUploading || !user.isDriveConnected}/>
                <button onClick={handleAddFile} disabled={isUploading || !user.isDriveConnected} className={`w-full flex justify-center items-center text-white font-bold py-2 px-4 rounded-lg transition-transform active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')} disabled:opacity-70`}>
                    {isUploading ? (
                        <><LoaderCircle className="w-5 h-5 mr-2 animate-spin"/> {t('uploading')}</>
                    ) : (
                        <><PlusCircle className="w-5 h-5 mr-2"/> {t('add_file_button')}</>
                    )}
                </button>
            </div>
            
            <div className="space-y-4">
                 <div className="flex justify-between items-center gap-2 flex-wrap">
                    <div className="relative flex-grow">
                         <input type="text" placeholder={t('admin_search_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="p-2 pl-8 border rounded-lg w-full"/>
                         <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    {isSelecting ? (
                        <div className="flex gap-2 ml-2">
                            <button onClick={handleDeleteFiles} disabled={selectedFileIds.length === 0} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors active:scale-95 disabled:opacity-50"><Trash2 className="w-5 h-5"/> ({selectedFileIds.length})</button>
                            <button onClick={() => { setIsSelecting(false); setSelectedFileIds([]); }} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors active:scale-95">{t('cancel_button')}</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsSelecting(true)} className={`ml-2 text-white font-bold py-2 px-4 rounded-lg transition-colors active:scale-95 ${getThemeClasses('bg')} ${getThemeClasses('hover-bg')}`}>{t('select_files_button')}</button>
                    )}
                </div>
                {subjectFiles.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-4">{t('no_files_found')}</p>
                ) : (
                    <ul className="space-y-3">
                        {subjectFiles.map(file => (
                            <li key={file.id} onClick={isSelecting ? () => toggleFileSelection(file.id) : undefined} className={`bg-white p-3 rounded-lg shadow-sm flex items-center justify-between transition-all duration-200 ${isSelecting ? 'cursor-pointer' : ''} ${selectedFileIds.includes(file.id) ? `ring-2 ${getThemeClasses('ring')}`: 'hover:bg-gray-50'}`}>
                                {isSelecting && <input type="checkbox" readOnly checked={selectedFileIds.includes(file.id)} className={`mr-4 w-5 h-5 rounded ${getThemeClasses('text')} focus:ring-0`} />}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 truncate">{file.title}</p>
                                    <p className="text-sm text-gray-500">{(file.createdAt as any).toDate().toLocaleDateString()}</p>
                                </div>
                                <a href={file.fileUrl} onClick={(e) => { e.stopPropagation(); if(isSelecting) e.preventDefault();} } target="_blank" rel="noopener noreferrer" className="ml-2 bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded-md shadow flex items-center gap-1 transition-colors active:scale-95"><Link className="w-3 h-3"/> {t('view_button')}</a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default SubjectView;
