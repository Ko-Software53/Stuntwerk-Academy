import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { NodeWrapper } from './NodeWrapper';

interface CraftImageProps {
    src?: string;
    alt?: string;
    borderRadius?: number;
    layout?: 'full' | 'standard' | 'small';
    aspectRatio?: 'auto' | '16/9' | '4/3' | '1/1';
    objectFit?: string;
    height?: number;
    alignment?: 'left' | 'center' | 'right';
    marginTop?: number;
    marginBottom?: number;
}

export const CraftImage = ({
    src = '',
    alt = '',
    borderRadius = 8,
    layout = 'standard',
    aspectRatio = 'auto',
    objectFit = 'cover',
    height = 0,
    alignment = 'center',
    marginTop = 8,
    marginBottom = 8,
}: CraftImageProps) => {
    const { connectors: { connect, drag } } = useNode();

    const getMaxWidth = () => {
        switch (layout) {
            case 'full': return '100%';
            case 'small': return '50%';
            case 'standard': default: return '80%';
        }
    };

    const getJustifyContent = () => {
        switch (alignment) {
            case 'left': return 'flex-start';
            case 'right': return 'flex-end';
            case 'center': default: return 'center';
        }
    };

    const getAspectRatio = () => {
        if (height > 0) return undefined;
        return aspectRatio === 'auto' ? undefined : aspectRatio;
    };

    return (
        <NodeWrapper connect={connect} drag={drag}>
            <div
                className="w-full flex"
                style={{
                    justifyContent: getJustifyContent(),
                    marginTop: `${marginTop}px`,
                    marginBottom: `${marginBottom}px`,
                }}
            >
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    style={{
                        width: '100%',
                        maxWidth: getMaxWidth(),
                        height: height > 0 ? `${height}px` : undefined,
                        aspectRatio: getAspectRatio(),
                        borderRadius: `${borderRadius}px`,
                        objectFit: objectFit as any,
                        display: 'block',
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            ) : (
                <div
                    style={{
                        width: '100%',
                        maxWidth: getMaxWidth(),
                        height: height > 0 ? `${height}px` : undefined,
                        aspectRatio: height > 0 ? undefined : (aspectRatio === 'auto' ? '16/9' : aspectRatio),
                        borderRadius: `${borderRadius}px`,
                        background: 'hsl(var(--muted))',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--muted-foreground))',
                    }}
                    className="gap-2"
                >
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    <span className="text-sm font-medium">Bild auswählen (in Einstellungen)</span>
                </div>
            )}
            </div>
        </NodeWrapper>
    );
};

const CraftImageSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props as CraftImageProps }));
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `course-images/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('course-media')
                .getPublicUrl(filePath);

            setProp((p: any) => p.src = publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-md border border-border/50 space-y-3">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Bildquelle</label>

                <div>
                    <Button variant="outline" size="sm" className="w-full gap-2 relative overflow-hidden" disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isUploading ? 'Lade hoch...' : 'Bild hochladen'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">Oder URL eingeben</span></div>
                </div>

                <input type="text" value={props.src || ''} onChange={(e) => setProp((p: any) => p.src = e.target.value)} placeholder="https://..." className="w-full h-8 px-2 text-xs border border-border rounded bg-background" />
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Alternativtext</label>
                    <input type="text" value={props.alt || ''} onChange={(e) => setProp((p: any) => p.alt = e.target.value)} placeholder="Für Barrierefreiheit..." className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                </div>

                <div>
                    <label className="text-xs font-medium text-muted-foreground">Layout-Größe</label>
                    <select value={props.layout || 'standard'} onChange={(e) => setProp((p: any) => p.layout = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                        <option value="full">Volle Breite (100%)</option>
                        <option value="standard">Standard (80%)</option>
                        <option value="small">Klein (50%)</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-medium text-muted-foreground">Ausrichtung</label>
                    <div className="flex gap-1 mt-1">
                        {(['left', 'center', 'right'] as const).map((a) => (
                            <button
                                key={a}
                                onClick={() => setProp((p: any) => p.alignment = a)}
                                className={`flex-1 h-8 text-xs rounded border transition-colors ${(props.alignment || 'center') === a ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                            >
                                {a === 'left' ? 'Links' : a === 'center' ? 'Mitte' : 'Rechts'}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Höhe</label>
                        <span className="text-[10px] text-muted-foreground">{(props.height || 0) > 0 ? `${props.height}px` : 'Auto'}</span>
                    </div>
                    <Slider
                        value={[props.height || 0]}
                        onValueChange={([v]) => setProp((p: any) => p.height = v)}
                        min={0}
                        max={800}
                        step={10}
                        className="mt-1.5"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">0 = Automatische Höhe</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Format</label>
                        <select value={props.aspectRatio || 'auto'} onChange={(e) => setProp((p: any) => p.aspectRatio = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                            <option value="auto">Auto</option>
                            <option value="16/9">16:9 (Quer)</option>
                            <option value="4/3">4:3 (Klassisch)</option>
                            <option value="1/1">1:1 (Quadratisch)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Eckenradius</label>
                        <input type="number" value={props.borderRadius ?? 8} onChange={(e) => setProp((p: any) => p.borderRadius = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-muted-foreground">Einpassung</label>
                    <select value={props.objectFit || 'cover'} onChange={(e) => setProp((p: any) => p.objectFit = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                        <option value="cover">Füllen (Zuschneiden)</option>
                        <option value="contain">Einpassen (Ganzes Bild)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Abstand oben</label>
                        <input type="number" value={props.marginTop ?? 8} onChange={(e) => setProp((p: any) => p.marginTop = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" min={0} max={200} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Abstand unten</label>
                        <input type="number" value={props.marginBottom ?? 8} onChange={(e) => setProp((p: any) => p.marginBottom = parseInt(e.target.value) || 0)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1" min={0} max={200} />
                    </div>
                </div>
            </div>
        </div>
    );
};

CraftImage.craft = {
    displayName: 'Bild',
    props: { src: '', alt: '', borderRadius: 8, layout: 'standard', aspectRatio: 'auto', objectFit: 'cover', height: 0, alignment: 'center', marginTop: 8, marginBottom: 8, customWidth: '', customHeight: '' },
    related: { settings: CraftImageSettings },
};
