import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientDto } from "@/lib/api";
import { cn } from "@/lib/utils";

type ClientComboboxProps = {
  clients: ClientDto[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  buttonClassName?: string;
};

export function ClientCombobox({
  clients,
  value,
  onChange,
  placeholder = "Выберите клиента",
  searchPlaceholder = "Найти клиента",
  emptyText = "Клиент не найден",
  disabled = false,
  buttonClassName,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === value) ?? null,
    [clients, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between px-3 font-normal text-sm",
            !selectedClient && "text-muted-foreground",
            buttonClassName,
          )}
        >
          <span className="truncate">{selectedClient?.name ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.email ?? ""} ${client.phone ?? ""}`}
                  onSelect={() => {
                    onChange(String(client.id));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(client.id) === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{client.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
