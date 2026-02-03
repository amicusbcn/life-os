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

// types/system.ts

export type ModuleStatus = 'development' | 'beta' | 'stable' | 'deprecated';

export interface AppModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  current_version: string;
  status: ModuleStatus;
  updated_at: string;
}

export type ChangeType = 'feat' | 'fix' | 'refactor' | 'chore' | 'style' | 'docs';

export interface AppModuleChangelog {
  id: string;
  module_id: string;
  version: string;
  change_type: ChangeType;
  title: string;
  description: string | null;
  is_breaking_change: boolean;
  created_at: string;
  user_id: string;
}