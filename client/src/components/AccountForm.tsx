import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, type CreateAccountInput } from '@/lib/api';

export function AccountForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateAccountInput>({
    name: '',
    industry: '',
    annualRevenue: null,
    billingCity: '',
  });
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sync-metrics'] });
      setOpen(false);
      setForm({ name: '', industry: '', annualRevenue: null, billingCity: '' });
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    mutation.mutate({
      name: form.name.trim(),
      industry: form.industry?.trim() || null,
      annualRevenue: form.annualRevenue,
      billingCity: form.billingCity?.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ New Account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={form.industry ?? ''}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Technology"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="revenue">Annual revenue</Label>
            <Input
              id="revenue"
              type="number"
              value={form.annualRevenue ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  annualRevenue:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="1000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Billing city</Label>
            <Input
              id="city"
              value={form.billingCity ?? ''}
              onChange={(e) => setForm({ ...form, billingCity: e.target.value })}
              placeholder="Warsaw"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}