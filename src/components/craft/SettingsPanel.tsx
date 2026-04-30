import React from 'react';
import { useEditor } from '@craftjs/core';
import { Trash2 } from 'lucide-react';

export function SettingsPanel() {
    const { selected, actions, query } = useEditor((state) => {
        const currentNodeId = state.events.selected ? [...state.events.selected][0] : null;
        let selected: any = null;

        if (currentNodeId) {
            const node = state.nodes[currentNodeId];
            if (node) {
                selected = {
                    id: currentNodeId,
                    name: node.data.displayName || node.data.name || 'Element',
                    settings: node.related?.settings,
                    isDeletable: query.node(currentNodeId).isDeletable(),
                };
            }
        }

        return { selected };
    });

    if (!selected) {
        return (
            <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Klicke auf ein Element, um die Einstellungen zu bearbeiten</p>
            </div>
        );
    }

    const SettingsComponent = selected.settings;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">{selected.name}</p>
                {selected.isDeletable && (
                    <button
                        onClick={() => actions.delete(selected.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        title="Element löschen"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {SettingsComponent ? (
                <SettingsComponent />
            ) : (
                <p className="text-xs text-muted-foreground">Keine Einstellungen verfügbar</p>
            )}
        </div>
    );
}
