import React from 'react';
import { useNode, Element } from '@craftjs/core';
import { CraftContainer } from './CraftContainer';
import { NodeWrapper } from './NodeWrapper';

interface CraftColumnsProps {
    columns?: 2 | 3;
    gap?: number;
}

export const CraftColumns = ({
    columns = 2,
    gap = 16,
}: CraftColumnsProps) => {
    const { connectors: { connect, drag } } = useNode();

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: `${gap}px`,
                    width: '100%',
                }}
            >
                {Array.from({ length: columns }).map((_, i) => (
                    <Element key={i} id={`column-${i}`} is={CraftContainer} canvas padding={12} minHeight={60} background="transparent" borderWidth={1} borderColor="#e2e8f0" borderRadius={4}>
                    </Element>
                ))}
            </div>
        </NodeWrapper>
    );
};

const CraftColumnsSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-muted-foreground">Spalten</label>
                <select value={props.columns ?? 2} onChange={(e) => setProp((p: any) => p.columns = parseInt(e.target.value))} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                    <option value={2}>2 Spalten</option>
                    <option value={3}>3 Spalten</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Abstand</label>
                <input type="number" value={props.gap ?? 16} onChange={(e) => setProp((p: any) => p.gap = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
            </div>
        </div>
    );
};

CraftColumns.craft = {
    displayName: 'Spalten',
    props: { columns: 2, gap: 16, customWidth: '', customHeight: '' },
    related: { settings: CraftColumnsSettings },
};
