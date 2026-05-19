import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Calendar, AlertCircle, Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const PRIORITY_VARIANT = { LOW: 'secondary', MEDIUM: 'warning', HIGH: 'destructive' };
const PRIORITY_LABEL   = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

// Pure visual content — used by both TaskCard and DragOverlay
export function TaskCardContent({ task, isAdmin, onEdit, onDelete, showGrip = true }) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <>
      <div className="flex items-start gap-2">
        {showGrip && (
          <GripVertical className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        )}
        <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>
        {isAdmin && onEdit && onDelete && (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(task)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
        {task.assignedTo && (
          <Badge variant="outline" className="text-xs">{task.assignedTo.name}</Badge>
        )}
        {task.dueDate && (
          <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
            {isOverdue && <AlertCircle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>
    </>
  );
}

export default function TaskCard({ task, isAdmin, onEdit, onDelete, isSyncing = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
    disabled: isSyncing,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transform ? undefined : 'box-shadow 150ms ease, opacity 150ms ease',
    opacity: isDragging ? 0.35 : 1,
    cursor: isSyncing ? 'default' : isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white border rounded-lg p-3 shadow-sm space-y-2 select-none
        transition-shadow duration-150 hover:shadow-md
        ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''}
      `}
    >
      {/* Syncing overlay */}
      {isSyncing && (
        <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center z-10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}

      {/* Drag handle — only the grip icon triggers drag */}
      <div className="flex items-start gap-2">
        <span
          {...listeners}
          {...attributes}
          className={`mt-0.5 shrink-0 transition-colors ${isSyncing ? 'text-muted-foreground/30' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>

        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => onEdit(task)} disabled={isSyncing}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete(task.id)} disabled={isSyncing}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        <Badge variant={PRIORITY_VARIANT[task.priority]}>
          {PRIORITY_LABEL[task.priority]}
        </Badge>
        {task.assignedTo && (
          <Badge variant="outline" className="text-xs">{task.assignedTo.name}</Badge>
        )}
        {task.dueDate && (() => {
          const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'DONE';
          return (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          );
        })()}
      </div>
    </div>
  );
}
