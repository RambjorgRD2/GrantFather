
import { ArrowRight } from "lucide-react";

interface AutocompleteProps {
  query: string;
  keywords: string[];
  visible: boolean;
  onApply: (kw: string) => void;
}

export function Autocomplete({ query, keywords, visible, onApply }: AutocompleteProps) {
  if (!visible || !query) return null;

  const matches = keywords.filter((k) => k.includes(query.toLowerCase()));

  return (
    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow">
      {matches.map((k) => (
        <button
          key={k}
          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent"
          onClick={() => onApply(k)}
        >
          <span>{k}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      ))}
      {matches.length === 0 && (
        <div className="px-3 py-2 text-sm text-muted-foreground">No suggestions</div>
      )}
    </div>
  );
}
