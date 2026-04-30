import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, Trash2, Clock, Pencil, FileText } from 'lucide-react';

export interface Lesson {
  id?: string;
  title: string;
  content: string;
  video_url: string;
  order_index: number;
  duration_minutes: number;
}

interface LessonBuilderProps {
  lessons: Lesson[];
  onChange: (lessons: Lesson[]) => void;
}

export function LessonBuilder({ lessons, onChange }: LessonBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => (l.id || `temp-${l.order_index}`) === active.id);
      const newIndex = lessons.findIndex((l) => (l.id || `temp-${l.order_index}`) === over.id);
      const reordered = arrayMove(lessons, oldIndex, newIndex).map((l, i) => ({ ...l, order_index: i }));
      onChange(reordered);
    }
  };

  const addLesson = () => {
    onChange([
      ...lessons,
      {
        title: `Lektion ${lessons.length + 1}`,
        content: '',
        video_url: '',
        order_index: lessons.length,
        duration_minutes: 10,
      },
    ]);
  };

  const updateLesson = (index: number, updates: Partial<Lesson>) => {
    onChange(lessons.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  };

  const removeLesson = (index: number) => {
    onChange(lessons.filter((_, i) => i !== index).map((l, i) => ({ ...l, order_index: i })));
  };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={lessons.map((l) => l.id || `temp-${l.order_index}`)} strategy={verticalListSortingStrategy}>
          {lessons.map((lesson, index) => (
            <SortableLessonCard
              key={lesson.id || `temp-${lesson.order_index}`}
              lesson={lesson}
              index={index}
              onUpdate={(updates) => updateLesson(index, updates)}
              onRemove={() => removeLesson(index)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="outline" onClick={addLesson} className="w-full gap-2 py-8 border-dashed">
        + Neue Lektion hinzufügen
      </Button>
    </div>
  );
}

interface SortableLessonCardProps {
  lesson: Lesson;
  index: number;
  onUpdate: (updates: Partial<Lesson>) => void;
  onRemove: () => void;
}

function SortableLessonCard({ lesson, index, onUpdate, onRemove }: SortableLessonCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { courseId } = useParams();
  const navigate = useNavigate();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id || `temp-${lesson.order_index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasContent = lesson.content && lesson.content.trim().length > 0;
  const canEditContent = !!lesson.id; // Must be saved first

  return (
    <Card ref={setNodeRef} style={style}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center p-4 gap-3">
          <button {...attributes} {...listeners} className="cursor-grab hover:bg-muted p-1 rounded touch-none">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground w-20">Lektion {index + 1}</span>
            <Input value={lesson.title} onChange={(e) => onUpdate({ title: e.target.value })} className="flex-1 font-medium" placeholder="Lektionstitel" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <Input type="number" value={lesson.duration_minutes} onChange={(e) => onUpdate({ duration_minutes: parseInt(e.target.value) || 0 })} className="w-16 text-center" min={0} />
              <span className="text-sm">Min.</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Video-URL (optional)</label>
              <Input value={lesson.video_url} onChange={(e) => onUpdate({ video_url: e.target.value })} placeholder="https://youtube.com/embed/..." />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-md border border-border/50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Lektionsinhalt</p>
                  <p className="text-xs text-muted-foreground">
                    {hasContent ? 'Inhalt vorhanden — klicke zum Bearbeiten' : 'Noch kein Inhalt erstellt'}
                  </p>
                </div>
              </div>
              <Button
                variant={hasContent ? 'outline' : 'default'}
                size="sm"
                className="gap-2"
                disabled={!canEditContent}
                onClick={() => {
                  if (courseId && canEditContent) {
                    navigate(`/admin/courses/${courseId}/lessons/${index}`);
                  }
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                {hasContent ? 'Bearbeiten' : 'Inhalt erstellen'}
              </Button>
              {!canEditContent && (
                <p className="text-xs text-muted-foreground ml-2">Bitte speichern Sie den Kurs zuerst</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
