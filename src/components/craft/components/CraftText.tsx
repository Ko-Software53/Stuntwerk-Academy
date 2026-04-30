import React, { useState, useEffect, useCallback } from 'react';
import { useNode } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import { NodeWrapper } from './NodeWrapper';

interface CraftTextProps {
    text?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: string;
    lineHeight?: number;
}

export const CraftText = ({
    text = 'Text hier eingeben...',
    fontSize = 16,
    fontWeight = '400',
    color = 'inherit',
    textAlign = 'left',
    lineHeight = 1.6,
}: CraftTextProps) => {
    const {
        connectors: { connect, drag },
        selected,
        actions: { setProp },
    } = useNode((state) => ({
        selected: state.events.selected,
    }));

    const [editable, setEditable] = useState(false);

    useEffect(() => {
        if (!selected) setEditable(false);
    }, [selected]);

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div
                onClick={() => selected && setEditable(true)}
                style={{ cursor: selected ? 'text' : 'pointer' }}
            >
                <ContentEditable
                    disabled={!editable}
                    html={text}
                    onChange={(e) => setProp((props: any) => props.text = e.target.value.replace(/<\/?[^>]+(>|$)/g, ''))}
                    tagName="p"
                    style={{
                        fontSize: `${fontSize}px`,
                        fontWeight,
                        color,
                        textAlign: textAlign as any,
                        lineHeight,
                        outline: 'none',
                        minHeight: '1em',
                    }}
                />
            </div>
        </NodeWrapper>
    );
};

const CraftTextSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-muted-foreground">Text</label>
                <textarea
                    value={props.text || ''}
                    onChange={(e) => setProp((p: any) => p.text = e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background mt-1 resize-none"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Schriftgröße</label>
                    <input type="number" value={props.fontSize ?? 16} onChange={(e) => setProp((p: any) => p.fontSize = parseInt(e.target.value) || 16)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Schriftstärke</label>
                    <select value={props.fontWeight || '400'} onChange={(e) => setProp((p: any) => p.fontWeight = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                        <option value="300">Leicht</option>
                        <option value="400">Normal</option>
                        <option value="500">Mittel</option>
                        <option value="600">Halbfett</option>
                        <option value="700">Fett</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Farbe</label>
                <div className="flex gap-2 mt-1">
                    <input type="color" value={props.color === 'inherit' ? '#000000' : props.color} onChange={(e) => setProp((p: any) => p.color = e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input type="text" value={props.color || 'inherit'} onChange={(e) => setProp((p: any) => p.color = e.target.value)} className="flex-1 h-8 px-2 text-xs border border-border rounded bg-background" />
                </div>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Ausrichtung</label>
                <div className="flex gap-1 mt-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                            key={align}
                            onClick={() => setProp((p: any) => p.textAlign = align)}
                            className={`flex-1 h-8 text-xs rounded border ${props.textAlign === align ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background hover:bg-muted'}`}
                        >
                            {align === 'left' ? 'Links' : align === 'center' ? 'Mitte' : 'Rechts'}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Zeilenhöhe</label>
                <input type="number" step="0.1" value={props.lineHeight ?? 1.6} onChange={(e) => setProp((p: any) => p.lineHeight = parseFloat(e.target.value) || 1.6)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
            </div>
        </div>
    );
};

CraftText.craft = {
    displayName: 'Text',
    props: {
        text: 'Text hier eingeben...',
        fontSize: 16,
        fontWeight: '400',
        color: 'inherit',
        textAlign: 'left',
        lineHeight: 1.6,
        customWidth: '',
        customHeight: '',
    },
    related: {
        settings: CraftTextSettings,
    },
};
