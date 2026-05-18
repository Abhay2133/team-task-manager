import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EMPTY = { title: '', description: '', dueDate: '', priority: 'MEDIUM', assignedToId: '' };

export default function TaskForm({ open, onClose, onSubmit, members = [], initial = null, isPending }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        dueDate: initial.dueDate ? initial.dueDate.split('T')[0] : '',
        priority: initial.priority || 'MEDIUM',
        assignedToId: initial.assignedToId || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [initial, open]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="Task title"
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={set('priority')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate')(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={form.assignedToId || 'unassigned'} onValueChange={(v) => set('assignedToId')(v === 'unassigned' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={isPending || !form.title.trim()}>
            {isPending ? 'Saving…' : initial ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
