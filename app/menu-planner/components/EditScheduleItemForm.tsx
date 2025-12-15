// app/menu-planner/components/EditScheduleItemForm.tsx

'use client';

import { useState } from 'react';
import { MenuScheduleItem, MenuRecipeSimple, MenuRecipeCategory, TurnType, MealType } from '@/types/menu-planner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { upsertScheduleItem } from '@/app/menu-planner/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner'; // Asumimos que tienes configurado 'sonner' para notificaciones

interface EditScheduleItemFormProps {
  scheduleDate: string;
  mealType: MealType;
  turnType: TurnType;
  initialItems: MenuScheduleItem[];
  allRecipes: MenuRecipeSimple[];
  allCategories: MenuRecipeCategory[];
}

export default function EditScheduleItemForm({
  scheduleDate,
  mealType,
  turnType,
  initialItems,
  allRecipes,
  allCategories,
}: EditScheduleItemFormProps) {
  
  // Usaremos un estado para manejar el plato principal (order_in_meal: 1)
  const primaryItem = initialItems.find(item => item.order_in_meal === 1) || {};
  
  const [recipeId, setRecipeId] = useState<string | undefined | null>(primaryItem.recipe_id);
  const [freeText, setFreeText] = useState<string | undefined | null>(primaryItem.free_text);
  const [isOut, setIsOut] = useState<boolean>(primaryItem.is_out || false);
  const [isPending, setIsPending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // Estado para el filtro

  const filteredRecipes = selectedCategory === 'all'
    ? allRecipes
    : allRecipes.filter(recipe => 
        recipe.menu_recipe_category_link?.some(link => 
          link.menu_recipe_categories.some(cat => cat.id === selectedCategory)
        )
      );

  // Acción del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    
    // Datos de slot (Ocultos/Contexto)
    formData.append('scheduleDate', scheduleDate);
    formData.append('turnType', turnType);
    formData.append('mealType', mealType);
    formData.append('orderInMeal', '1'); // Solo manejamos el 1er plato por ahora

    // Datos de contenido
    formData.append('isOut', isOut ? 'true' : 'false');
    
    if (recipeId) {
      formData.append('recipeId', recipeId);
      formData.append('freeText', ''); // Limpiamos texto libre si hay receta
    } else if (freeText && freeText.trim() !== '') {
      formData.append('freeText', freeText.trim());
      formData.append('recipeId', ''); // Limpiamos ID de receta si hay texto libre
    } else {
        // Si no hay nada, limpiamos el slot (usamos null en DB y la acción lo limpia)
        formData.append('recipeId', ''); 
        formData.append('freeText', '');
    }

    const result = await upsertScheduleItem(formData);
    
    setIsPending(false);

    if (result.success) {
      toast.success('Plato planificado correctamente.');
      // Aquí se debería cerrar el modal. Asumimos que el padre lo gestiona al refrescar.
      // Mejorar: usar un hook para forzar un refresh del router de Next.js
      window.location.reload(); // FORZAR REFRESH temporalmente.
    } else {
      toast.error(result.error || 'Error desconocido al guardar la planificación.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Opción: Comer fuera de casa */}
      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-md">
        <Checkbox 
          id="isOut" 
          checked={isOut} 
          onCheckedChange={(checked) => setIsOut(!!checked)}
        />
        <Label htmlFor="isOut" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          ¿Coméis/Cenáis fuera de casa? (Marca esto para no planificar)
        </Label>
      </div>

      {!isOut && (
        <Tabs defaultValue="recipe" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recipe">Elegir Receta</TabsTrigger>
            <TabsTrigger value="freetext">Texto Rápido/Idea</TabsTrigger>
          </TabsList>
          
          {/* PESTAÑA 1: ELEGIR RECETA */}
          <TabsContent value="recipe" className="space-y-4 pt-4">
            <Label htmlFor="category-filter">Filtrar por Categoría</Label>
            <Select onValueChange={setSelectedCategory} value={selectedCategory}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {allCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label htmlFor="recipe-select">Seleccionar Receta ({filteredRecipes.length} disponibles)</Label>
            <Select onValueChange={setRecipeId} value={recipeId || ''}>
              <SelectTrigger id="recipe-select">
                <SelectValue placeholder="Selecciona una receta de la lista..." />
              </SelectTrigger>
              <SelectContent>
                {filteredRecipes.length === 0 && <SelectItem value="" disabled>No hay recetas en esta categoría.</SelectItem>}
                {filteredRecipes.map(recipe => (
                  <SelectItem key={recipe.id} value={recipe.id}>{recipe.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          {/* PESTAÑA 2: TEXTO LIBRE / CREAR RECETA FUTURA */}
          <TabsContent value="freetext" className="pt-4">
            <Label htmlFor="free-text">Texto Libre o Enlace Futuro</Label>
            <Input 
              id="free-text" 
              placeholder="Ej: Pollo al Curry (Crear Receta)" 
              value={freeText || ''}
              onChange={(e) => setFreeText(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Si el texto coincide con una receta futura, al guardarlo se convertirá en un enlace de creación rápida.
            </p>
          </TabsContent>
        </Tabs>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar Planificación'}
        </Button>
      </div>
    </form>
  );
}