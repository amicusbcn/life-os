import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'; 
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { UserMenuProps } from '@/types/common'; // Asegúrate de que este tipo exista

// Componentes y datos Server-Side
import { getFinanceDashboardData } from './data'; 
import { FinanceDashboardView } from './components/FinanceDashboardView';
import { FinanceMenu } from './components/FinanceMenu';
import { FinanceAccount, FinanceCategory, FinanceTransaction } from '@/types/finance';
import { Banknote } from 'lucide-react';

export default async function FinancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Manejo de autenticación
    if (!user) {
        return redirect('/login');
    }

    // 2. Obtener datos del perfil/rol (para el Header)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    const userRole = profile?.role || 'user';

    // 3. Obtener todos los datos del Dashboard
    const { accounts, categories, transactions } = await getFinanceDashboardData();
    
    // 4. Calcular el Saldo Total Global (Simple suma de initial_balance)
    // NOTA: El saldo real requiere sumar todas las transacciones. Esto es solo inicial.
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);

    // 5. Renderizar la UI
    return (
        <div className="min-h-screen bg-slate-100 font-sans pb-24">
            
            <UnifiedAppHeader
                title="Finanzas Personales"
                backHref="/"
                userEmail={user.email || ''}
                userRole={userRole}
                maxWClass='max-w-7xl' // Usamos un ancho mayor para la tabla de transacciones
                moduleMenu={
                    <FinanceMenu 
                        accounts={accounts} 
                        categories={categories}
                    />
                } 
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <div className="bg-white p-6 rounded-xl shadow">
                    <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                        <Banknote className="w-5 h-5 mr-2 text-green-600"/> Resumen Global
                    </h2>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {totalBalance.toFixed(2)} €
                    </p>
                    <p className="text-sm text-slate-500">Saldo inicial total de {accounts.length} cuentas</p>
                </div>

                {/* 6. Delegamos el renderizado de la tabla al componente cliente */}
                <FinanceDashboardView 
                    accounts={accounts}
                    categories={categories}
                    transactions={transactions}
                />
            </div>
        </div>
    );
}