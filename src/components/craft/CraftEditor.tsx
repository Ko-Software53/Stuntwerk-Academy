import React, { useCallback, useState, useEffect } from 'react';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { CraftContainer } from './components/CraftContainer';
import { CraftColumns } from './components/CraftColumns';
import { CraftText } from './components/CraftText';
import { CraftHeading } from './components/CraftHeading';
import { CraftImage } from './components/CraftImage';
import { CraftVideo } from './components/CraftVideo';
import { CraftSpacer } from './components/CraftSpacer';
import { CraftDivider } from './components/CraftDivider';
import { CraftButton } from './components/CraftButton';
import { Toolbar } from './Toolbar';
import { SettingsPanel } from './SettingsPanel';
import { Undo2, Redo2, Save, Eye, EyeOff, Loader2 } from 'lucide-react';

const resolver = {
    CraftContainer,
    CraftColumns,
    CraftText,
    CraftHeading,
    CraftImage,
    CraftVideo,
    CraftSpacer,
    CraftDivider,
    CraftButton,
};

interface CraftEditorProps {
    initialData?: string;
    onSave?: (json: string) => void;
    isSaving?: boolean;
}

function EditorTopBar({ onSave, isSaving }: { onSave?: (json: string) => void; isSaving?: boolean }) {
    const { actions, query, canUndo, canRedo } = useEditor((state, query) => ({
        canUndo: query.history.canUndo(),
        canRedo: query.history.canRedo(),
    }));

    const [preview, setPreview] = useState(false);

    const handleSave = useCallback(() => {
        const json = query.serialize();
        onSave?.(json);
    }, [query, onSave]);

    const togglePreview = useCallback(() => {
        setPreview(!preview);
        actions.setOptions((options) => {
            options.enabled = preview; // toggle: if preview was true, enable editing
        });
    }, [actions, preview]);

    return (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-card">
            <div className="flex items-center gap-1">
                <button
                    onClick={() => actions.history.undo()}
                    disabled={!canUndo}
                    className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                    title="Rückgängig"
                >
                    <Undo2 className="h-4 w-4" />
                </button>
                <button
                    onClick={() => actions.history.redo()}
                    disabled={!canRedo}
                    className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                    title="Wiederholen"
                >
                    <Redo2 className="h-4 w-4" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={togglePreview}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${preview ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                    {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {preview ? 'Bearbeiten' : 'Vorschau'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isSaving ? 'Speichern...' : 'Speichern'}
                </button>
            </div>
        </div>
    );
}

export function CraftEditor({ initialData, onSave, isSaving }: CraftEditorProps) {
    return (
        <Editor resolver={resolver} enabled={true}>
            <div className="flex flex-col h-full bg-background">
                <EditorTopBar onSave={onSave} isSaving={isSaving} />
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Toolbar — left sidebar */}
                    <div className="w-52 border-r border-border bg-card/50 p-3 overflow-y-auto flex-shrink-0">
                        <Toolbar />
                    </div>

                    {/* Canvas — main area */}
                    <div className="flex-1 overflow-y-auto bg-[#f0f0f0] p-8">
                        <div className="max-w-3xl mx-auto bg-white rounded-md shadow-md border border-border/50 min-h-[600px]">
                            <Frame data={initialData}>
                                <Element is={CraftContainer} canvas padding={32} minHeight={600} background="#ffffff">
                                </Element>
                            </Frame>
                        </div>
                    </div>

                    {/* Settings panel — right sidebar */}
                    <div className="w-60 border-l border-border bg-card/50 p-3 overflow-y-auto flex-shrink-0">
                        <p className="text-xs font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wider">Einstellungen</p>
                        <SettingsPanel />
                    </div>
                </div>
            </div>
        </Editor>
    );
}
