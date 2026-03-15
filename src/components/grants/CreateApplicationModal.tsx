import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useActiveOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { addDays, format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PrefillData {
  projectName?: string;
  summary?: string;
  targetAudience?: string;
}

interface CreateApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: PrefillData;
}

const formSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  fundingAmount: z.coerce.number().positive('Funding amount must be positive'),
  summary: z.string().min(1, 'Summary is required'),
  targetAudience: z.string().min(1, 'Target audience is required'),
  timelineStart: z.date({
    required_error: 'Start date is required',
  }),
  timelineEnd: z.date({
    required_error: 'End date is required',
  }),
  sameEndDate: z.boolean().default(true),
  expectedImpact: z.string().min(1, 'Expected impact is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateApplicationModal({
  open,
  onOpenChange,
  prefillData,
}: CreateApplicationModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const defaultStartDate = addDays(new Date(), 30);
  const defaultEndDate = addDays(new Date(), 30);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: prefillData?.projectName ?? '',
      fundingAmount: 0,
      summary: prefillData?.summary ?? '',
      targetAudience: prefillData?.targetAudience ?? '',
      timelineStart: defaultStartDate,
      timelineEnd: defaultEndDate,
      sameEndDate: true,
      expectedImpact: '',
    },
  });

  // Update form when prefill data or open state changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        projectName: prefillData?.projectName ?? '',
        fundingAmount: 0,
        summary: prefillData?.summary ?? '',
        targetAudience: prefillData?.targetAudience ?? '',
        timelineStart: defaultStartDate,
        timelineEnd: defaultEndDate,
        sameEndDate: true,
        expectedImpact: '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillData?.projectName, prefillData?.summary, prefillData?.targetAudience]);

  // Use global active organization
  const { organization } = useActiveOrganization();

  const mutation = useMutation({
    mutationFn: async (data: {
      project_name: string;
      funding_amount: number;
      summary: string;
      target_audience: string;
      timeline_start: string;
      timeline_end: string;
      expected_impact: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get user's organization
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', userData.user.id)
        .single();

      if (roleError || !roleData) {
        throw new Error(
          'You must belong to an organization to create applications'
        );
      }

      const { data: result, error } = await supabase
        .from('grant_applications')
        .insert({
          user_id: userData.user.id,
          organization_id: roleData.organization_id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast.success('Grant application created successfully!');
      queryClient.invalidateQueries({ queryKey: ['grant-applications'] });
      onOpenChange(false);
      form.reset();
      navigate(`/apply/draft/${data.id}`);
    },
    onError: (error) => {
      console.error('Error creating application:', error);
      toast.error('Failed to create application. Please try again.');
    },
  });

  const sameEndDate = form.watch('sameEndDate');
  const timelineStart = form.watch('timelineStart');

  // Sync end date with start date when checkbox is checked
  React.useEffect(() => {
    if (sameEndDate && timelineStart) {
      form.setValue('timelineEnd', timelineStart);
    }
  }, [sameEndDate, timelineStart, form]);

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      project_name: values.projectName,
      funding_amount: values.fundingAmount,
      summary: values.summary,
      target_audience: values.targetAudience,
      timeline_start: format(values.timelineStart, 'yyyy-MM-dd'),
      timeline_end: format(values.timelineEnd, 'yyyy-MM-dd'),
      expected_impact: values.expectedImpact,
    });
  };

  if (!organization) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Required</DialogTitle>
            <DialogDescription>
              You need to complete your organization setup before creating grant
              applications.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate('/onboarding')}>
              Setup Organization
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="create-application-modal"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {prefillData?.projectName
              ? `Apply to ${prefillData.projectName}`
              : 'Create New Grant Application'}
          </DialogTitle>
          <DialogDescription>
            Fill in the basic information for your grant application. You can
            refine it with AI assistance later.
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
                    <Input
                      data-testid="project-name-input"
                      placeholder="Enter project name"
                      {...field}
                    />
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
                      data-testid="summary-textarea"
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
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
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
                      <FormLabel>Same as start date</FormLabel>
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
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground',
                              sameEndDate && 'opacity-50'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
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
                          disabled={(date) => date < new Date() || sameEndDate}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
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
              <Button
                data-testid="save-application-button"
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Creating...' : 'Create Application'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
