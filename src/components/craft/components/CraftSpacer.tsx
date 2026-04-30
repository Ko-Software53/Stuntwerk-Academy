import React from 'react';
import { useNode } from '@craftjs/core';
import { NodeWrapper } from './NodeWrapper';

interface CraftSpacerProps {
    height?: number;
}

export const CraftSpacer = ({ height = 32 }: CraftSpacerProps) => {
    const { connectors: { connect, drag } } = useNode();

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div style={{ height: `${height}px`, width: '100%' }} />
        </NodeWrapper>
    );
};

const CraftSpacerSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-muted-foreground">Höhe (px)</label>
                <input type="number" value={props.height ?? 32} min={4} onChange={(e) => setProp((p: any) => p.height = parseInt(e.target.value) || 32)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
            </div>
        </div>
    );
};

CraftSpacer.craft = {
    displayName: 'Abstand',
    props: { height: 32, customWidth: '', customHeight: '' },
    related: { settings: CraftSpacerSettings },
};
