'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { Check, ChevronsUpDown, Utensils, BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// 🚨 Importar la Server Action y la interfaz de sugerencia
import { searchSuggestions} from '@/app/menu-planner/actions'; 
import { Suggestion, MenuPlanItemAutocompleteProps } from '@/types/menu-planner';


export default function MenuPlanItemAutocomplete({ initialValue, onSelect, isLoading }: MenuPlanItemAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Lógica de Búsqueda ---
  const fetchSuggestions = useCallback((query: string) => {
    if (!query || query.length < 2) { // Buscar solo si hay al menos 2 caracteres
      setSuggestions([]);
      return;
    }

    startTransition(async () => {
      const results = await searchSuggestions(query);
      setSuggestions(results);
    });
  }, []);

  // Ejecutar búsqueda cuando el valor cambia (con debounce implícito por useTransition)
  useEffect(() => {
    fetchSuggestions(searchValue);
  }, [searchValue, fetchSuggestions]);
  
  // --- Lógica de Selección ---
  const handleSelect = (selected: Suggestion | 'new') => {
    let output: Parameters<typeof onSelect>[0];

    if (selected === 'new') {
      // Nueva entrada de texto libre
      output = { id: null, name: searchValue.trim(), type: 'new' };
    } else {
      // Receta o Sugerencia histórica
      output = { 
        id: selected.type === 'recipe' ? selected.id : null, 
        name: selected.value, 
        type: selected.type 
      };
    }

    onSelect(output);
    setSearchValue(output.name || '');
    setOpen(false);
  };
  
  // Icono para el tipo de sugerencia
  const getTypeIcon = (type: 'recipe' | 'free_text') => {
    return type === 'recipe' ? <BookOpen className="w-3 h-3 text-indigo-500 mr-2" /> : <Utensils className="w-3 h-3 text-gray-500 mr-2" />;
  };

  const currentMatch = suggestions.find(s => s.value.toLowerCase() === searchValue.toLowerCase());
  const isNewEntry = searchValue.trim() && !currentMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-left font-normal"
          disabled={isLoading}
        >
          {initialValue || (
            <span className="text-gray-500 flex items-center">
              <Search className="w-4 h-4 mr-2" /> Buscar comida...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false} className="relative">
          {/* Usamos el input del Popover para la búsqueda */}
          <CommandInput
            placeholder="Buscar recetas o platos..."
            value={searchValue}
            onValueChange={setSearchValue}
            ref={inputRef}
          />
          {isSearching && (
            <div className="absolute top-2 right-2 text-gray-400">...</div>
          )}

          <CommandList>
            <CommandEmpty>No hay sugerencias que coincidan.</CommandEmpty>
            <CommandGroup heading="Sugerencias">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id + suggestion.type}
                  value={suggestion.value}
                  onSelect={() => handleSelect(suggestion)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      initialValue === suggestion.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {getTypeIcon(suggestion.type)}
                  {suggestion.value}
                </CommandItem>
              ))}
            </CommandGroup>
            
            {/* 🚨 Opción de Entrada Nueva (si no coincide con nada) */}
            {isNewEntry && (
              <CommandGroup heading="Nueva entrada">
                <CommandItem onSelect={() => handleSelect('new')} className="text-green-600">
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="font-semibold">{`Añadir: "${searchValue}"`}</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}