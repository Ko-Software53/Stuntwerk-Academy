import React from 'react';
import { useNode } from '@craftjs/core';
import { NodeWrapper } from './NodeWrapper';

interface CraftButtonProps {
    text?: string;
    href?: string;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    align?: 'left' | 'center' | 'right';
}

const variantStyles = {
    primary: {
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        border: 'none',
    },
    secondary: {
        background: 'hsl(var(--secondary))',
        color: 'hsl(var(--secondary-foreground))',
        border: 'none',
    },
    outline: {
        background: 'transparent',
        color: 'hsl(var(--foreground))',
        border: '1px solid hsl(var(--border))',
    },
};

const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '8px 16px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' },
};

export const CraftButton = ({
    text = 'Button',
    href = '',
    variant = 'primary',
    size = 'md',
    align = 'left',
}: CraftButtonProps) => {
    const { connectors: { connect, drag } } = useNode();

    const style = {
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '500',
        display: 'inline-block',
        textDecoration: 'none',
        textAlign: 'center' as const,
    };

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div style={{ textAlign: align as any }}>
                {href ? (
                    <a href={href} style={style} target="_blank" rel="noreferrer">{text}</a>
                ) : (
                    <span style={style}>{text}</span>
                )}
            </div>
        </NodeWrapper>
    );
};

const CraftButtonSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium text-muted-foreground">Text</label>
                <input type="text" value={props.text || ''} onChange={(e) => setProp((p: any) => p.text = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Link (optional)</label>
                <input type="text" value={props.href || ''} onChange={(e) => setProp((p: any) => p.href = e.target.value)} placeholder="https://..." className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Variante</label>
                <select value={props.variant || 'primary'} onChange={(e) => setProp((p: any) => p.variant = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                    <option value="primary">Primär</option>
                    <option value="secondary">Sekundär</option>
                    <option value="outline">Umriss</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Größe</label>
                <select value={props.size || 'md'} onChange={(e) => setProp((p: any) => p.size = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                    <option value="sm">Klein</option>
                    <option value="md">Mittel</option>
                    <option value="lg">Groß</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-muted-foreground">Ausrichtung</label>
                <div className="flex gap-1 mt-1">
                    {(['left', 'center', 'right'] as const).map((a) => (
                        <button key={a} onClick={() => setProp((p: any) => p.align = a)}
                            className={`flex-1 h-8 text-xs rounded border ${props.align === a ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background hover:bg-muted'}`}>
                            {a === 'left' ? 'Links' : a === 'center' ? 'Mitte' : 'Rechts'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

CraftButton.craft = {
    displayName: 'Button',
    props: { text: 'Button', href: '', variant: 'primary', size: 'md', align: 'left', customWidth: '', customHeight: '' },
    related: { settings: CraftButtonSettings },
};
