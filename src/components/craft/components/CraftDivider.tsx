import React from 'react';
import { useNode } from '@craftjs/core';
import { NodeWrapper } from './NodeWrapper';

interface CraftDividerProps {
    color?: string;
    thickness?: number;
    marginY?: number;
}

export const CraftDivider = ({
    color = '#e2e8f0',
    thickness = 1,
    marginY = 16,
}: CraftDividerProps) => {
    const { connectors: { connect, drag } } = useNode();

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div style={{ padding: `${marginY}px 0` }}>
                <hr style={{ border: 'none', borderTop: `${thickness}px solid ${color}`, margin: 0 }} />
            </div>
        </NodeWrapper>
    );
};

const CraftDividerSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-muted-foreground">Farbe</label>
                <div className="flex gap-2 mt-1">
                    <input type="color" value={props.color || '#e2e8f0'} onChange={(e) => setProp((p: any) => p.color = e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input type="text" value={props.color || '#e2e8f0'} onChange={(e) => setProp((p: any) => p.color = e.target.value)} className="flex-1 h-8 px-2 text-xs border border-border rounded bg-background" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Stärke</label>
                    <input type="number" value={props.thickness ?? 1} min={1} onChange={(e) => setProp((p: any) => p.thickness = parseInt(e.target.value) || 1)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Abstand (Y)</label>
                    <input type="number" value={props.marginY ?? 16} onChange={(e) => setProp((p: any) => p.marginY = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
            </div>
        </div>
    );
};

CraftDivider.craft = {
    displayName: 'Trennlinie',
    props: { color: '#e2e8f0', thickness: 1, marginY: 16, customWidth: '', customHeight: '' },
    related: { settings: CraftDividerSettings },
};
