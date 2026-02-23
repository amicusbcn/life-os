'use client';

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
  icon: React.ReactNode;
}

export function IconPicker({ 
    options, 
    value, 
    onChange, 
    placeholder = "Seleccionar..." 
}: { 
    options: Option[], 
    value: string, 
    onChange: (val: string) => void,
    placeholder?: string
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between rounded-xl h-12 border-slate-200 bg-white hover:bg-slate-50 transition-all font-bold uppercase text-[10px]"
        >
          <div className="flex items-center gap-2 truncate">
            {selected ? selected.icon : <div className="w-4 h-4 border rounded-full border-dashed" />}
            {selected ? selected.label : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                >
                  <div className={cn("flex items-center gap-2 flex-1 font-bold uppercase text-[10px]", 
                    value === opt.value ? "text-blue-600" : "text-slate-600"
                  )}>
                    {opt.icon}
                    {opt.label}
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}