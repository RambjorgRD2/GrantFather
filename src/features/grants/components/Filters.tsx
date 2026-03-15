
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2 } from "lucide-react";

interface FiltersProps {
  minAmount: number;
  maxAmount: number;
  setMinAmount: (v: number) => void;
  setMaxAmount: (v: number) => void;
  deadlineBefore: string | null;
  setDeadlineBefore: (v: string | null) => void;
  region: string | null;
  setRegion: (v: string | null) => void;
  eligibility: string[];
  setEligibility: (updater: (prev: string[]) => string[]) => void;
  regions: string[];
  eligibilityOptions: string[];
  onApply: () => void;
  isApplying: boolean;
}

export function Filters({
  minAmount, maxAmount, setMinAmount, setMaxAmount,
  deadlineBefore, setDeadlineBefore,
  region, setRegion,
  eligibility, setEligibility,
  regions, eligibilityOptions,
  onApply, isApplying
}: FiltersProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Funding amount (k NOK)</Label>
        <div className="px-1">
          <Slider
            min={0}
            max={2000}
            step={50}
            value={[minAmount, maxAmount]}
            onValueChange={(v) => { 
              const [min, max] = v as number[]; 
              setMinAmount(min); 
              setMaxAmount(max); 
            }}
          />
          <div className="mt-2 text-sm text-muted-foreground">{minAmount} – {maxAmount}</div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Deadline before</Label>
        <div className="relative">
          <Input
            type="date"
            value={deadlineBefore ?? ""}
            onChange={(e) => setDeadlineBefore(e.target.value || null)}
          />
          <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Region</Label>
        <Select onValueChange={(v) => setRegion(v)} value={region ?? undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Eligibility</Label>
        <div className="space-y-2">
          {eligibilityOptions.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <Checkbox
                checked={eligibility.includes(opt)}
                onCheckedChange={(checked) => {
                  setEligibility((prev) => checked ? [...prev, opt] : prev.filter((e) => e !== opt));
                }}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={onApply} disabled={isApplying}>
        {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Apply filters
      </Button>
    </div>
  );
}
