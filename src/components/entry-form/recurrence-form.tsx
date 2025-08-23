"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { RECURRENCE_LIMITS } from "@/types";
import type { RecurrenceFrequency } from "@/types";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SERVICE_START_DATE } from "@/lib/config";

interface RecurringSectionProps {
  isRecurring: boolean;
  setIsRecurring: (value: boolean) => void;
  recurringFrequency: RecurrenceFrequency;
  setRecurringFrequency: (value: RecurrenceFrequency) => void;
  endDate: Date;
  setEndDate: (value: Date) => void;
  selectedWeekdays: number[];
  setSelectedWeekdays: Dispatch<SetStateAction<number[]>>;
  interval: number;
  setInterval: (value: number) => void;
  selectedDate: Date;
}

export function RecurringSection({
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
  endDate,
  setEndDate,
  selectedWeekdays,
  setSelectedWeekdays,
  interval,
  setInterval,
  selectedDate,
}: RecurringSectionProps) {
  const toggleWeekday = useCallback(
    (day: number) => {
      setSelectedWeekdays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
      );
    },
    [setSelectedWeekdays]
  );

  const getMaxEndDate = (frequency?: RecurrenceFrequency) => {
    return addDays(selectedDate, RECURRENCE_LIMITS[frequency || recurringFrequency].maxDays);
  };

  const getDefaultEndDate = (frequency?: RecurrenceFrequency) => {
    return addDays(selectedDate, RECURRENCE_LIMITS[frequency || recurringFrequency].defaultDays);
  };

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="recurring">Recurring</Label>
        </div>
        <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
      </div>

      {isRecurring && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">Every</span>
            <Input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12"
            />
            <Select
              value={recurringFrequency}
              onValueChange={(value: RecurrenceFrequency) => {
                setRecurringFrequency(value);
                setEndDate(getDefaultEndDate(value));
                if (!(value === "daily" || value === "weekly")) {
                  setSelectedWeekdays([]);
                }
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{interval === 1 ? "day" : "days"}</SelectItem>
                <SelectItem value="weekly">{interval === 1 ? "week" : "weeks"}</SelectItem>
                <SelectItem value="monthly">{interval === 1 ? "month" : "months"}</SelectItem>
                <SelectItem value="yearly">{interval === 1 ? "year" : "years"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurringFrequency === "weekly" && (
            <div className="space-y-2">
              <Label>Days of week</Label>
              <div className="flex gap-1 flex-wrap">
                {[
                  { label: "S", val: 0 },
                  { label: "M", val: 1 },
                  { label: "T", val: 2 },
                  { label: "W", val: 3 },
                  { label: "T", val: 4 },
                  { label: "F", val: 5 },
                  { label: "S", val: 6 },
                ].map(({ label, val }) => (
                  <Button
                    key={val}
                    type="button"
                    variant={selectedWeekdays.includes(val) ? "default" : "outline"}
                    className="h-8 px-3"
                    onClick={() => toggleWeekday(val)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>End date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8 px-3 bg-transparent dark:bg-input/30 shadow-xs",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  disabled={{ before: selectedDate, after: getMaxEndDate() }}
                  captionLayout="dropdown"
                  startMonth={SERVICE_START_DATE}
                  endMonth={getMaxEndDate()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurringSection;