'use client'

import * as React from 'react'
import { X, Check, Plus } from 'lucide-react' // Añadimos icono Plus
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Command as CommandPrimitive } from 'cmdk'
import { cn } from '@/lib/utils'

type Option = Record<'value' | 'label', string>

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  onCreate?: (value: string) => void // NUEVA PROP
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  onCreate, // Recibimos la prop
  placeholder = 'Select...',
  className,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  const handleSelect = (valueToToggle: string) => {
    if (selected.includes(valueToToggle)) {
      onChange(selected.filter((s) => s !== valueToToggle))
    } else {
      onChange([...selected, valueToToggle])
    }
  }

  const handleUnselect = (valueToRemove: string) => {
    onChange(selected.filter((s) => s !== valueToRemove))
  }

  // Verificamos si lo que escribe el usuario ya existe exactamente
  const exactMatch = options.some(
    (option) => option.label.toLowerCase() === inputValue.toLowerCase()
  )

  return (
    <Command className={cn("overflow-visible bg-transparent", className)}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((val) => {
            const option = options.find((o) => o.value === val)
            const label = option ? option.label : val
            
            return (
              <Badge key={val} variant="secondary">
                {label}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUnselect(val) }}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onClick={() => handleUnselect(val)}
                  type="button"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            )
          })}
          
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      
      <div className="relative mt-2">
        {open && (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandList>
              <CommandGroup className="h-full overflow-auto max-h-60">
                {options.map((option) => {
                  const isSelected = selected.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        handleSelect(option.value)
                        setInputValue('')
                      }}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                      className="cursor-pointer"
                    >
                      <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                        <Check className={cn("h-4 w-4")} />
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  )
                })}

                {/* --- LÓGICA DE CREACIÓN --- */}
                {onCreate && inputValue.length > 0 && !exactMatch && (
                  <CommandItem
                    key="create-new"
                    value={inputValue}
                    onSelect={() => {
                      onCreate(inputValue) // Llamamos a la función padre
                      setInputValue('')
                    }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    className="cursor-pointer font-semibold text-blue-500"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear "{inputValue}"
                  </CommandItem>
                )}

              </CommandGroup>
            </CommandList>
          </div>
        )}
      </div>
    </Command>
  )
}