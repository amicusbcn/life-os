'use client';

import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale'; // Aseguramos la importación del locale
import { ChevronLeft, ChevronRight, Utensils, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MenuScheduleItem, MealType, TurnType } from '@/types/menu-planner'; 
import MenuPlannerItemCell from './MenuPlannerItemCell'; // Componente para la celda individual

// --- Lógica del Componente ---

interface MenuPlannerWeeklyTableProps {
  // Aquí recibiremos los datos cargados del servidor (pasaremos el objeto completo)
  initialSchedule: any; // Usaremos 'any' temporalmente hasta tipar bien la estructura del join
}

// Mapa de los tipos de comida para el encabezado
const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'lunch', label: 'Comida (Mediodía)' },
  { type: 'dinner', label: 'Cena (Noche)' },
];

export default function MenuPlannerWeeklyTable({ initialSchedule }: MenuPlannerWeeklyTableProps) {
  // 1. Estado para la semana (asumimos que la semana se calcula en el server y se pasa como initialSchedule)
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 2. Estado GLOBAL para el turno (ADULTOS por defecto)
  const [currentTurn, setCurrentTurn] = useState<TurnType>('adults');

  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Lunes
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Generar la matriz de los 7 días
  const weekDays = eachDayOfInterval({ start, end });
  
  // Función de navegación de semana
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'next' ? addDays(currentDate, 7) : addDays(currentDate, -7);
    setCurrentDate(newDate);
    // NOTA: Aquí habría que recargar la data del servidor para la nueva semana (usando useQuery o Server Action)
    // Por ahora, solo actualizamos el cliente para mostrar la estructura.
  };
  
  // Agrupar y aplanar los datos (Necesario si la BD devuelve schedule_items por separado)
  // Por ahora, simplemente simulamos el agrupamiento por día para la vista
  const scheduleByDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    // En una implementación real, buscarías en initialSchedule[dateKey]
    return []; 
  }


  return (
    <div className="space-y-4">
      
      {/* 🚨 SELECTOR GLOBAL DE TURNO */}
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

      {/* 🚨 Navegación de Semana */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigateWeek('prev')}><ChevronLeft className="w-4 h-4 mr-2" /> Anterior</Button>
        <Button variant="outline" onClick={() => navigateWeek('next')}>Siguiente <ChevronRight className="w-4 h-4 ml-2" /></Button>
      </div>

      {/* 🚨 TABLA REDISEÑADA (Días en Filas) */}
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
            // Obtener los items del servidor para el día
            const daySchedule = scheduleByDay(day); 

            return (
              <TableRow key={dateKey} className="hover:bg-indigo-50/50">
                
                {/* Columna Día */}
                <TableCell className="font-semibold text-center align-top p-2 border-r border-gray-200 bg-gray-50/50">
                  <span className="block text-base">{format(day, 'EEE', { locale: es })}</span>
                  <span className="block text-xl text-gray-500">{format(day, 'dd/MM')}</span>
                </TableCell>

                {/* Columnas Comida y Cena */}
                {MEAL_TYPES.map(meal => (
                  <TableCell key={meal.type} className="align-top p-1 border-r border-gray-200">
                    <MenuPlannerItemCell 
                        day={dateKey} 
                        mealType={meal.type} 
                        turnType={currentTurn} // 🚨 Pasamos el turno GLOBAL
                        items={[]} // Aquí irían los items filtrados por día, turno y mealType
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// NOTA: El componente MenuPlannerItemCell debe ser adaptado para recibir estos 4 props clave.