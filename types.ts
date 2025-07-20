import { Timestamp } from 'firebase/firestore';

export interface AppUser {
    uid: string;
    email: string;
    userName: string;
    profilePictureUrl: string;
    createdAt: Timestamp | Date;
    selectedSubjects: string[];
    schoolName: string;
    className: string;
    educationLevel: string;
    languagePreference: 'nl' | 'en';
    themePreference: string;
    fontPreference?: string;
    homeLayout?: string[];
    customSubjects?: string[];
    lastLoginDate?: Timestamp | Date;
    streakCount?: number;
    notificationsEnabled?: boolean;
    isAdmin?: boolean;
    disabled?: boolean;
    isVerifiedByEmail?: boolean;
    isDriveConnected?: boolean;
}

export interface AdminSettings {
    themePreference: string;
    fontPreference: string;
    pinProtectionEnabled: boolean;
}

export interface FileData {
    id: string;
    title: string;
    description: string;
    subject: string;
    ownerId: string;
    createdAt: Timestamp;
    fileUrl: string;
    storagePath: string;
    driveFileId?: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start: Timestamp;
    end: Timestamp;
    type: 'test' | 'presentation' | 'homework' | 'oral' | 'other';
    subject: string;
    ownerId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    subject: string;
    ownerId: string;

    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface ToDoTask {
    id: string;
    text: string;
    completed: boolean;
    ownerId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Flashcard {
    id: string;
    question: string;
    answer: string;
    ownerId: string;
    createdAt: Timestamp;
    dueDate?: Timestamp;
    interval?: number;
    easeFactor?: number;
}

export interface FlashcardSet {
    id:string;
    name: string;
    subject: string;
    ownerId: string;
    createdAt: Timestamp;
    cardCount: number;
}


export interface ModalContent {
    text: string;
    confirmAction?: () => void;
    cancelAction?: () => void;
}

export interface Notification {
    id: string;
    title?: string;
    text: string;
    type: 'system' | 'admin' | 'streak' | 'feedback_reply';
    read: boolean;
    createdAt: Timestamp;
    broadcastId?: string;
    feedbackId?: string;
}

export interface BroadcastData {
    id: string;
    title: string;
    message: string;
    createdAt: Timestamp;
}

export interface FeedbackReply {
    text: string;
    repliedAt: Timestamp;
    repliedBy: 'admin';
    isAdminReply: true;
}

export interface Feedback {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    message: string;
    status: 'new' | 'replied';
    createdAt: Timestamp;
    replies?: FeedbackReply[];
}