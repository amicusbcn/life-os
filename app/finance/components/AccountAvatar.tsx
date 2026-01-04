import { FinanceAccount } from "@/types/finance";
import { cn } from "@/lib/utils";

interface AccountAvatarProps {
    account: Partial<FinanceAccount>;
    className?: string;
}

export function AccountAvatar({ account, className }: AccountAvatarProps) {
    const letter = account.avatar_letter || account.name?.charAt(0).toUpperCase() || '?';
    const color = account.color_theme || '#64748b';

    return (
        <div 
            className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black border shadow-sm shrink-0 transition-all",
                className
            )}
            style={{ 
                backgroundColor: color + '20', 
                borderColor: color + '60', 
                color: color 
            }}
            title={account.name}
        >
            {letter}
        </div>
    );
}