'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Suggestion, MenuRecipeSimple } from '@/types/menu-planner'; 
import { searchSuggestions } from '@/app/menu-planner/actions';
import { debounce } from 'lodash'; 

interface AutocompleteProps {
  initialValue: string | null;
  // 🚨 CRÍTICO: Pasa el ID seleccionado y el texto escrito (query)
  onSelect: (recipeId: string | null, currentQuery: string | null) => void; 
  allRecipes: MenuRecipeSimple[]; 
}

// 🚨 COMPONENTE DE LISTA DE SUGERENCIAS
const SuggestionList = ({ suggestions, onSelect }: { suggestions: Suggestion[], onSelect: (s: Suggestion) => void }) => {
    if (suggestions.length === 0) return null;

    return (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg mt-1 max-h-60 overflow-y-auto">
            {suggestions.map(s => (
                <li 
                    key={s.id} 
                    className="p-2 hover:bg-indigo-50 cursor-pointer text-sm flex justify-between items-center"
                    onClick={() => onSelect(s)}
                >
                    {s.value} 
                    <span className="text-xs text-gray-500 ml-2">({s.type === 'recipe' ? 'Receta' : 'Crear'})</span>
                </li>
            ))}
        </ul>
    );
};

export default function MenuPlanItemAutocomplete({ initialValue, onSelect, allRecipes }: AutocompleteProps) {
  const [query, setQuery] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Lógica para resolver ID a nombre de receta
    if (initialValue && initialValue.length === 36 && allRecipes.length > 0) { 
        const recipe = allRecipes.find(r => r.id === initialValue);
        if (recipe) {
            setQuery(recipe.name);
        } else {
            setQuery('');
        }
    } else if (initialValue) {
         setQuery(initialValue);
    }
  }, [initialValue, allRecipes]);


  const fetchSuggestions = useCallback(
    debounce(async (searchValue: string) => {
      if (searchValue.trim().length > 1) {
        const results = await searchSuggestions(searchValue.trim());
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 300), 
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // 🚨 CRÍTICO: Devolvemos el valor actual del input (query) y anulamos el ID
    onSelect(null, value); 

    fetchSuggestions(value);
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.value);
    setSuggestions([]);
    
    if (suggestion.type === 'recipe') {
      // Devolver ID y anular la query de texto
      onSelect(suggestion.id, null); 
    } else {
        // En caso de que se haya escrito, devolver el texto
        onSelect(null, suggestion.value); 
    }
    setIsFocused(false);
  };
  
  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 200);
  };
  
  const handleFocus = () => {
      setIsFocused(true);
  };

  return (
    <div className="relative w-full">
      <Input
        id="meal-input"
        placeholder="Busca receta o escribe un plato..."
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      
      {isFocused && suggestions.length > 0 && (
        <SuggestionList 
            suggestions={suggestions} 
            onSelect={handleSuggestionSelect} 
        />
      )}

    </div>
  );
}