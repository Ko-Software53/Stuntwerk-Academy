import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Type,
  Image,
  Video,
  List,
  Quote,
  Code,
  FileText,
  Trash2,
  GripVertical,
  Plus,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type ContentBlockType = 'text' | 'heading' | 'image' | 'video' | 'list' | 'quote' | 'code' | 'divider';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  metadata?: {
    level?: 'h1' | 'h2' | 'h3';
    items?: string[];
    language?: string;
    caption?: string;
    alt?: string;
  };
}

interface ContentBlockEditorProps {
  block: ContentBlock;
  onUpdate: (block: ContentBlock) => void;
  onRemove: () => void;
}

const blockIcons: Record<ContentBlockType, React.ReactNode> = {
  text: <FileText className="h-4 w-4" />,
  heading: <Type className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
  quote: <Quote className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  divider: <div className="h-4 w-4 flex items-center"><div className="w-full h-0.5 bg-current" /></div>,
};

const blockLabels: Record<ContentBlockType, string> = {
  text: 'Text',
  heading: 'Überschrift',
  image: 'Bild',
  video: 'Video',
  list: 'Liste',
  quote: 'Zitat',
  code: 'Code',
  divider: 'Trennlinie',
};

export function SortableContentBlock({ block, onUpdate, onRemove }: ContentBlockEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-muted p-1 rounded"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {blockIcons[block.type]}
          <span className="font-medium">{blockLabels[block.type]}</span>
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ContentBlockInput block={block} onUpdate={onUpdate} />
    </div>
  );
}

function ContentBlockInput({ block, onUpdate }: { block: ContentBlock; onUpdate: (block: ContentBlock) => void }) {
  const updateContent = (content: string) => onUpdate({ ...block, content });
  const updateMetadata = (metadata: Partial<ContentBlock['metadata']>) =>
    onUpdate({ ...block, metadata: { ...block.metadata, ...metadata } });

  switch (block.type) {
    case 'text':
      return (
        <Textarea
          value={block.content}
          onChange={(e) => updateContent(e.target.value)}
          placeholder="Textinhalt eingeben..."
          rows={4}
          className="resize-none"
        />
      );

    case 'heading':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={block.metadata?.level || 'h2'}
              onValueChange={(value) => updateMetadata({ level: value as 'h1' | 'h2' | 'h3' })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">H1</SelectItem>
                <SelectItem value="h2">H2</SelectItem>
                <SelectItem value="h3">H3</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={block.content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Überschrift eingeben..."
              className="flex-1"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-2">
          <Input
            value={block.content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Bild-URL (https://...)"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={block.metadata?.alt || ''}
              onChange={(e) => updateMetadata({ alt: e.target.value })}
              placeholder="Alternativtext"
            />
            <Input
              value={block.metadata?.caption || ''}
              onChange={(e) => updateMetadata({ caption: e.target.value })}
              placeholder="Bildunterschrift (optional)"
            />
          </div>
          {block.content && (
            <div className="border border-border p-2 rounded">
              <img
                src={block.content}
                alt={block.metadata?.alt || 'Vorschau'}
                className="max-h-40 object-contain mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );

    case 'video':
      return (
        <div className="space-y-2">
          <Input
            value={block.content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Video-Embed-URL (YouTube, Vimeo, etc.)"
          />
          {block.content && (
            <div className="aspect-video border border-border rounded overflow-hidden">
              <iframe
                src={block.content}
                className="w-full h-full"
                allowFullScreen
                title="Videovorschau"
              />
            </div>
          )}
        </div>
      );

    case 'list':
      const items = block.metadata?.items || [''];
      return (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground mt-2">•</span>
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = e.target.value;
                  updateMetadata({ items: newItems });
                }}
                placeholder={`Listenpunkt ${i + 1}`}
                className="flex-1"
              />
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => updateMetadata({ items: items.filter((_, idx) => idx !== i) })}
                  className="h-9 w-9 text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateMetadata({ items: [...items, ''] })}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Eintrag hinzufügen
          </Button>
        </div>
      );

    case 'quote':
      return (
        <div className="border-l-4 border-primary pl-4">
          <Textarea
            value={block.content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Zitat eingeben..."
            rows={2}
            className="resize-none italic"
          />
        </div>
      );

    case 'code':
      return (
        <div className="space-y-2">
          <Select
            value={block.metadata?.language || 'javascript'}
            onValueChange={(value) => updateMetadata({ language: value })}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
              <SelectItem value="bash">Bash</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={block.content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="// Code eingeben..."
            rows={6}
            className="font-mono text-sm resize-none"
          />
        </div>
      );

    case 'divider':
      return (
        <div className="py-2">
          <div className="border-t border-border" />
        </div>
      );

    default:
      return null;
  }
}

interface AddBlockMenuProps {
  onAdd: (type: ContentBlockType) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const blockTypes: ContentBlockType[] = ['text', 'heading', 'image', 'video', 'list', 'quote', 'code', 'divider'];

  return (
    <div className="flex flex-wrap gap-2 p-4 border border-dashed border-border bg-muted/30 rounded-md">
      <span className="w-full text-sm text-muted-foreground mb-1">Inhaltsblock hinzufügen:</span>
      {blockTypes.map((type) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={() => onAdd(type)}
          className="gap-2"
        >
          {blockIcons[type]}
          {blockLabels[type]}
        </Button>
      ))}
    </div>
  );
}
