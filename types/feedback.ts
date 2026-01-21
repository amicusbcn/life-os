// types/feedback.ts

export type FeedbackCategory = 'bug' | 'improvement' | 'feature' | 'other';
export type SortKey = 'created_at' | 'profiles.full_name' | 'context_path' | 'is_processed';
export type SortOrder = 'asc' | 'desc';

export interface AppFeedback {
    id: string;
    created_at: string;
    content: string;
    type: FeedbackCategory;
    is_processed: boolean;
    user_id: string;
    context_path: string;
    
    // Relación con profiles (para mostrar el nombre)
    profiles: {
        full_name: string | null;
    } | null;
}

export interface FeedbackTableViewProps {
    proposals: AppFeedback[];
}

export interface FeedbackTableState {
    sortBy: SortKey;
    sortOrder: SortOrder;
}

// CONSTANTES UI (Opcional: Idealmente esto iría en un archivo constants.ts o utils)
export const FEEDBACK_CATEGORIES_MAP: Record<FeedbackCategory, { label: string; color: string }> = {
    bug: { label: 'Bug / Error', color: 'bg-red-500' },
    improvement: { label: 'Mejora UX/UI', color: 'bg-indigo-500' },
    feature: { label: 'Nueva Funcionalidad', color: 'bg-emerald-500' },
    other: { label: 'General / Otros', color: 'bg-slate-500' },
};



