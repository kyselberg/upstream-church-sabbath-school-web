import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type ComboMember = {
  id?: string
  memberId?: string
  fullName: string
  displayName?: string | null
}

export function MemberCombobox({
  members,
  value,
  onChange,
  placeholder = "Оберіть вчителя",
  disabled,
}: {
  members: ComboMember[]
  value: string | null | undefined
  onChange: (memberId: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const options = members.map((m) => ({
    id: (m.id ?? m.memberId)!,
    fullName: m.fullName,
  }))
  const selected = options.find((o) => o.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? selected.fullName : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Пошук..." />
          <CommandList>
            <CommandEmpty>Нічого не знайдено</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.fullName}
                  onSelect={() => {
                    onChange(o.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2",
                      o.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {o.fullName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
