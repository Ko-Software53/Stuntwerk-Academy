import React from 'react';
import { useEditor, Element } from '@craftjs/core';
import { CraftContainer } from './components/CraftContainer';
import { CraftColumns } from './components/CraftColumns';
import { CraftText } from './components/CraftText';
import { CraftHeading } from './components/CraftHeading';
import { CraftImage } from './components/CraftImage';
import { CraftVideo } from './components/CraftVideo';
import { CraftSpacer } from './components/CraftSpacer';
import { CraftDivider } from './components/CraftDivider';
import { CraftButton } from './components/CraftButton';
import { LayoutGrid, Columns3, Type, Heading, ImageIcon, Video, ArrowUpDown, Minus, MousePointerClick, Columns, MonitorPlay } from 'lucide-react';

interface ToolItem {
    name: string;
    icon: React.ReactNode;
    create: (connectors: any) => (ref: HTMLButtonElement | null) => void;
}

export function Toolbar() {
    const { connectors, actions } = useEditor();

    const tools: ToolItem[] = [
        { name: 'Container', icon: <LayoutGrid className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <Element is={CraftContainer} canvas padding={16} />); } },
        { name: 'Spalten', icon: <Columns3 className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftColumns />); } },
        { name: 'Text', icon: <Type className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftText />); } },
        { name: 'Überschrift', icon: <Heading className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftHeading />); } },
        { name: 'Bild', icon: <ImageIcon className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftImage />); } },
        { name: 'Video', icon: <Video className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftVideo />); } },
        { name: 'Abstand', icon: <ArrowUpDown className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftSpacer />); } },
        { name: 'Trennlinie', icon: <Minus className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftDivider />); } },
        { name: 'Button', icon: <MousePointerClick className="h-4 w-4" />, create: (c) => (ref) => { if (ref) c.create(ref, <CraftButton />); } },
    ];

    const templates = [
        {
            name: 'Hero Modul',
            icon: <MonitorPlay className="h-4 w-4" />,
            create: (c: any) => (ref: HTMLButtonElement | null) => {
                if (ref) c.create(ref,
                    <Element is={CraftContainer} canvas padding={32} background="#f8f9fa" borderRadius={12}>
                        <Element is={CraftContainer} canvas padding={0}>
                            <CraftHeading text="Titel des Moduls" level="h2" />
                            <CraftText text="Fügen Sie hier eine kurze Beschreibung ein, die den Teilnehmern erklärt, worum es geht." />
                        </Element>
                        <CraftSpacer height={20} />
                        <Element is={CraftContainer} canvas padding={0}>
                            <CraftVideo layout="full" />
                        </Element>
                    </Element>
                );
            }
        },
        {
            name: 'Text + Bild',
            icon: <Columns className="h-4 w-4" />,
            create: (c: any) => (ref: HTMLButtonElement | null) => {
                if (ref) c.create(ref,
                    <Element is={CraftContainer} canvas padding={16}>
                        <CraftHeading text="Neuer Abschnitt" level="h3" />
                        <CraftImage layout="standard" />
                        <CraftText text="Beschreibender Text unter dem Bild." />
                    </Element>
                );
            }
        }
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Elemente</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {tools.map((tool) => (
                        <button
                            key={tool.name}
                            ref={tool.create(connectors) as any}
                            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-md border border-border bg-background hover:bg-muted hover:border-primary/30 cursor-grab active:cursor-grabbing transition-colors text-center"
                        >
                            <span className="text-muted-foreground">{tool.icon}</span>
                            <span className="text-[10px] font-medium text-muted-foreground leading-tight">{tool.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Vorlagen</p>
                <div className="grid grid-cols-1 gap-1.5">
                    {templates.map((template) => (
                        <button
                            key={template.name}
                            ref={template.create(connectors) as any}
                            className="flex justify-start items-center gap-3 p-2.5 rounded-md border border-border bg-background hover:bg-muted hover:border-primary/30 cursor-grab active:cursor-grabbing transition-colors text-left"
                        >
                            <span className="flex items-center justify-center h-8 w-8 rounded bg-primary/10 text-primary">
                                {template.icon}
                            </span>
                            <span className="text-xs font-medium text-foreground">{template.name}</span>
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground px-1 mt-2">Vorlagen in den Canva-Bereich ziehen für ein fertiges Layout.</p>
            </div>
        </div>
    );
}
