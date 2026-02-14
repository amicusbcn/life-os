// app/inventory/components/ReturnLoanButton.tsx
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { returnInventoryLoan } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoanReturnButton({ loanId, itemId, onSuccess }: any) {
    const [loading, setLoading] = useState(false);

    const handleReturn = async () => {
        setLoading(true);
        const res = await returnInventoryLoan(loanId, itemId);
        if (res.success) {
            toast.success("Objeto marcado como devuelto");
            onSuccess?.();
        }
        setLoading(false);
    };

    return (
        <Button 
            size="sm" 
            variant="outline" 
            onClick={handleReturn}
            disabled={loading}
            className="h-8 text-[10px] font-bold uppercase border-orange-200 text-orange-600 hover:bg-orange-100 hover:text-orange-700"
        >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Devolver"}
        </Button>
    );
}