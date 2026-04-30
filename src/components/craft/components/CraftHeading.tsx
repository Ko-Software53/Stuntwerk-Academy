import React, { useState, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import { NodeWrapper } from './NodeWrapper';

interface CraftHeadingProps {
    text?: string;
    level?: 'h1' | 'h2' | 'h3';
    color?: string;
    textAlign?: string;
}

const levelStyles = {
    h1: { fontSize: '32px', fontWeight: '700' },
    h2: { fontSize: '24px', fontWeight: '600' },
    h3: { fontSize: '20px', fontWeight: '600' },
};

export const CraftHeading = ({
    text = 'Überschrift',
    level = 'h2',
    color = 'inherit',
    textAlign = 'left',
}: CraftHeadingProps) => {
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

    const styles = levelStyles[level];

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div onClick={() => selected && setEditable(true)}>
                <ContentEditable
                    disabled={!editable}
                    html={text}
                    onChange={(e) => setProp((props: any) => props.text = e.target.value.replace(/<\/?[^>]+(>|$)/g, ''))}
                    tagName={level}
                    style={{
                        ...styles,
                        color,
                        textAlign: textAlign as any,
                        outline: 'none',
                        margin: 0,
                    }}
                />
            </div>
        </NodeWrapper>
    );
};

const CraftHeadingSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-muted-foreground">Text</label>
                <input type="text" value={props.text || ''} onChange={(e) => setProp((p: any) => p.text = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Ebene</label>
                <select value={props.level || 'h2'} onChange={(e) => setProp((p: any) => p.level = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                    <option value="h1">H1 — Groß</option>
                    <option value="h2">H2 — Mittel</option>
                    <option value="h3">H3 — Klein</option>
                </select>
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
                        <button key={align} onClick={() => setProp((p: any) => p.textAlign = align)}
                            className={`flex-1 h-8 text-xs rounded border ${props.textAlign === align ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background hover:bg-muted'}`}>
                            {align === 'left' ? 'Links' : align === 'center' ? 'Mitte' : 'Rechts'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

CraftHeading.craft = {
    displayName: 'Überschrift',
    props: { text: 'Überschrift', level: 'h2', color: 'inherit', textAlign: 'left', customWidth: '', customHeight: '' },
    related: { settings: CraftHeadingSettings },
};
