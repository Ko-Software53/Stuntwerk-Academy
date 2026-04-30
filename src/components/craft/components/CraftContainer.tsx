import React from 'react';
import { useNode, Element } from '@craftjs/core';
import { NodeWrapper } from './NodeWrapper';

interface CraftContainerProps {
    background?: string;
    padding?: number;
    margin?: number;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    minHeight?: number;
    flexDirection?: 'column' | 'row';
    alignItems?: string;
    justifyContent?: string;
    gap?: number;
    children?: React.ReactNode;
}

export const CraftContainer = ({
    background = 'transparent',
    padding = 16,
    margin = 0,
    borderRadius = 0,
    borderWidth = 0,
    borderColor = '#e2e8f0',
    minHeight = 40,
    flexDirection = 'column',
    alignItems = 'stretch',
    justifyContent = 'flex-start',
    gap = 8,
    children,
}: CraftContainerProps) => {
    const { connectors: { connect, drag } } = useNode();

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div
                style={{
                    background,
                    padding: `${padding}px`,
                    margin: `${margin}px`,
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
                    minHeight: `${minHeight}px`,
                    display: 'flex',
                    flexDirection,
                    alignItems,
                    justifyContent,
                    gap: `${gap}px`,
                }}
            >
                {children}
            </div>
        </NodeWrapper>
    );
};

const CraftContainerSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-muted-foreground">Hintergrundfarbe</label>
                <div className="flex gap-2 mt-1">
                    <input type="color" value={props.background || '#ffffff'} onChange={(e) => setProp((p: any) => p.background = e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input type="text" value={props.background || 'transparent'} onChange={(e) => setProp((p: any) => p.background = e.target.value)} className="flex-1 h-8 px-2 text-xs border border-border rounded bg-background" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Innenabstand</label>
                    <input type="number" value={props.padding ?? 16} onChange={(e) => setProp((p: any) => p.padding = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Außenabstand</label>
                    <input type="number" value={props.margin ?? 0} onChange={(e) => setProp((p: any) => p.margin = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Eckenradius</label>
                    <input type="number" value={props.borderRadius ?? 0} onChange={(e) => setProp((p: any) => p.borderRadius = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Min. Höhe</label>
                    <input type="number" value={props.minHeight ?? 40} onChange={(e) => setProp((p: any) => p.minHeight = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Randbreite</label>
                    <input type="number" value={props.borderWidth ?? 0} onChange={(e) => setProp((p: any) => p.borderWidth = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Abstand</label>
                    <input type="number" value={props.gap ?? 8} onChange={(e) => setProp((p: any) => p.gap = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Richtung</label>
                <select value={props.flexDirection || 'column'} onChange={(e) => setProp((p: any) => p.flexDirection = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                    <option value="column">Vertikal</option>
                    <option value="row">Horizontal</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Ausrichtung</label>
                <select value={props.alignItems || 'stretch'} onChange={(e) => setProp((p: any) => p.alignItems = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                    <option value="stretch">Strecken</option>
                    <option value="flex-start">Oben / Links</option>
                    <option value="center">Zentriert</option>
                    <option value="flex-end">Unten / Rechts</option>
                </select>
            </div>
        </div>
    );
};

CraftContainer.craft = {
    displayName: 'Container',
    props: {
        background: 'transparent',
        padding: 16,
        margin: 0,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: '#e2e8f0',
        minHeight: 40,
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        gap: 8,
        customWidth: '',
        customHeight: '',
    },
    related: {
        settings: CraftContainerSettings,
    },
    rules: {
        canDrag: () => true,
    },
};
