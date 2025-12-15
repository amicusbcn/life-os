// app/menu-planner/components/MenuPlannerWeeklyTable.tsx
'use client';

import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, addDays, eachDayOfInterval,isPast,parseISO } from 'date-fns';
import { es } from 'date-fns/locale'; 
import { ChevronLeft, ChevronRight, Utensils, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MenuScheduleItem, MealType, TurnType, MenuRecipeSimple, MenuRecipeCategory } from '@/types/menu-planner'; 
import MenuPlannerItemCell from './MenuPlannerItemCell'; 
// --- Lógica del Componente ---

interface ScheduleResult {
    [key: string]: { 
        menu_schedule_items: MenuScheduleItem[];
        schedule_date: string;
        id: string;
    }; 
}

interface MenuPlannerWeeklyTableProps {
    initialSchedule: ScheduleResult | any; // Objeto keyed por fecha
    // 🚨 Propiedades estáticas añadidas
    allRecipes: MenuRecipeSimple[]; 
    allCategories: MenuRecipeCategory[];
}

const MEAL_TYPES: { type: MealType; label: string }[] = [
    { type: 'lunch', label: 'Comida (Mediodía)' },
    { type: 'dinner', label: 'Cena (Noche)' },
];

export default function MenuPlannerWeeklyTable({ initialSchedule, allRecipes, allCategories }: MenuPlannerWeeklyTableProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentTurn, setCurrentTurn] = useState<TurnType>('adults');

    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); 
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });

    const weekDays = eachDayOfInterval({ start, end });
    
    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = direction === 'next' ? addDays(currentDate, 7) : addDays(currentDate, -7);
        setCurrentDate(newDate);
        // NOTA: La recarga de datos para la nueva semana aún no está implementada (depende de hooks de fetch o Server Actions)
    };
    
    /**
     * Filtra los ítems del día por turno y tipo de comida.
     */
    const getItemsForCell = (dateKey: string, mealType: MealType, turnType: TurnType): MenuScheduleItem[] => {
        const daySchedule = initialSchedule[dateKey];
        
        if (!daySchedule || !daySchedule.menu_schedule_items) return [];

        return daySchedule.menu_schedule_items.filter((item: MenuScheduleItem) => 
            item.meal_type === mealType && item.turn_type === turnType
        );
    }


    const isDayPast = (dateKey: string) => {
        // Usamos parseISO para convertir 'yyyy-MM-dd' a Date y comparamos con la fecha actual.
        // Comparamos el día completo, no la hora, para que el día actual no sea 'pasado'.
        const today = new Date();
        const targetDate = parseISO(dateKey);
        // Para comparar solo el día (ignorar la hora), ajustamos today al inicio del día.
        today.setHours(0, 0, 0, 0); 
        
        // Si la fecha objetivo es estrictamente anterior al inicio del día de hoy, es pasado.
        return targetDate < today;
    };
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                    <Utensils className="w-5 h-5 mr-2" />
                    Planificación <br/>({format(start, 'dd/MM')} - {format(end, 'dd/MM', { locale: es })})
                </h2>
                <ToggleGroup 
                    type="single" 
                    value={currentTurn} 
                    onValueChange={(value: TurnType) => setCurrentTurn(value)} 
                    className="bg-white rounded-full p-1 shadow-inner"
                >
                    <ToggleGroupItem value="adults" aria-label="Adultos" className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white">
                        Adultos
                    </ToggleGroupItem>
                    <ToggleGroupItem value="children" aria-label="Niños" className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white">
                        Niños
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => navigateWeek('prev')}><ChevronLeft className="w-4 h-4 mr-2" /> Anterior</Button>
                <Button variant="outline" onClick={() => navigateWeek('next')}>Siguiente <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>


            <Table className="border-collapse border border-gray-200">
                <TableHeader className="bg-indigo-50">
                    <TableRow>
                        <TableHead className="w-[120px] font-bold text-center border-r border-gray-200">Día</TableHead>
                        {MEAL_TYPES.map(meal => (
                            <TableHead key={meal.type} className="font-bold text-center border-r border-gray-200">
                                {meal.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                
                <TableBody>
                    {weekDays.map((day: Date) => { 
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const isPastDay = isDayPast(dateKey);
                        const pastDayClass = isPastDay ? 'bg-slate-50 opacity-60' : 'hover:bg-indigo-50/50';
                        const pastDayCellClass = isPastDay ? 'text-slate-400' : 'text-gray-500';
                        return (
                            <TableRow key={dateKey} className={pastDayClass}>
                                
                                <TableCell className="font-semibold text-center align-top p-2 border-r border-gray-200 bg-gray-50/50">
                                    <span className="block text-base">{format(day, 'EEE', { locale: es })}</span>
                                    <span className="block text-xl text-gray-500">{format(day, 'dd/MM')}</span>
                                </TableCell>

                                {MEAL_TYPES.map(meal => {
                                    const itemsForCell = getItemsForCell(dateKey, meal.type, currentTurn);
                                    return (
                                        <TableCell key={meal.type} className={`font-semibold text-center align-top p-2 border-r border-gray-200 bg-gray-50/50 ${pastDayCellClass}`}>
                                            <MenuPlannerItemCell 
                                                day={dateKey} 
                                                mealType={meal.type} 
                                                turnType={currentTurn} 
                                                items={itemsForCell} // 🚨 Usamos los ítems filtrados
                                                allRecipes={allRecipes} // 🚨 Propagamos la Recetas
                                                allCategories={allCategories} // 🚨 Propagamos las Categorías
                                            />
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}