// types/commons.ts (Versión Limpia)

export interface UnifiedAppHeaderProps { 
    title: string;
    backHref?: string | null; 
    rightAction?: React.ReactNode; 
    moduleMenu?: React.ReactNode; 
    maxWClass?: string;
    userEmail: string;
    userRole: string | null; 
}

export type ActionResponse<T = undefined> = 
  | { success: true; message?: string; data?: T }
  | { success: false; error: string; message?: string };


export interface UserMenuProps {
    userEmail: string;
    userRole: string | null;
    additionalItems?: React.ReactNode[]; 
    currentPath?: string;
}