import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface EditApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    id: string;
    project_name: string;
    funding_amount: number | null;
    summary: string | null;
    target_audience: string | null;
    timeline_start: string | null;
    timeline_end: string | null;
    expected_impact: string | null;
  };
}

const formSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  fundingAmount: z.coerce.number().positive("Funding amount must be positive"),
  summary: z.string().min(1, "Summary is required"),
  targetAudience: z.string().min(1, "Target audience is required"),
  timelineStart: z.date({
    required_error: "Start date is required",
  }),
  timelineEnd: z.date({
    required_error: "End date is required",
  }),
  sameEndDate: z.boolean().default(false),
  expectedImpact: z.string().min(1, "Expected impact is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function EditApplicationModal({ open, onOpenChange, application }: EditApplicationModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: application.project_name,
      fundingAmount: application.funding_amount || 0,
      summary: application.summary || "",
      targetAudience: application.target_audience || "",
      timelineStart: application.timeline_start ? parseISO(application.timeline_start) : new Date(),
      timelineEnd: application.timeline_end ? parseISO(application.timeline_end) : new Date(),
      sameEndDate: application.timeline_start === application.timeline_end,
      expectedImpact: application.expected_impact || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: Omit<FormValues, 'sameEndDate'>) => {
      const { error } = await supabase
        .from("grant_applications")
        .update({
          project_name: data.projectName,
          funding_amount: data.fundingAmount,
          summary: data.summary,
          target_audience: data.targetAudience,
          timeline_start: format(data.timelineStart, 'yyyy-MM-dd'),
          timeline_end: format(data.timelineEnd, 'yyyy-MM-dd'),
          expected_impact: data.expectedImpact,
        })
        .eq('id', application.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["grant-applications"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error updating application:", error);
      toast.error("Failed to update application. Please try again.");
    },
  });

  const sameEndDate = form.watch("sameEndDate");
  const timelineStart = form.watch("timelineStart");

  // Sync end date with start date when checkbox is checked
  React.useEffect(() => {
    if (sameEndDate && timelineStart) {
      form.setValue("timelineEnd", timelineStart);
    }
  }, [sameEndDate, timelineStart, form]);

  const onSubmit = (values: FormValues) => {
    const { sameEndDate: _, ...submitData } = values;
    mutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Grant Application</DialogTitle>
          <DialogDescription>
            Update the details of your grant application.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fundingAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funding Amount (NOK)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter funding amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a brief summary of your project"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Who will benefit from this project?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="timelineStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sameEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Same as start date
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timelineEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            disabled={sameEndDate}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                              sameEndDate && "opacity-50"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || sameEndDate
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expectedImpact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Impact</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the expected impact of your project"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Application"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}