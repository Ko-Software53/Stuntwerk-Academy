import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NodeWrapper } from './NodeWrapper';

interface CraftVideoProps {
    src?: string;
    aspectRatio?: string;
    layout?: 'full' | 'standard';
    autoPlay?: boolean;
    controls?: boolean;
}

export const CraftVideo = ({
    src = '',
    aspectRatio = '16/9',
    layout = 'standard',
    autoPlay = false,
    controls = true,
}: CraftVideoProps) => {
    const { connectors: { connect, drag } } = useNode();

    // Check if it's a direct file URL vs embedded (youtube/vimeo)
    const isDirectFile = src.includes('.mp4') || src.includes('supabase.co');

    return (
        <NodeWrapper connect={connect} drag={drag}>
        <div className={`w-full flex ${layout === 'standard' ? 'justify-center' : ''} py-2`}>
            {src ? (
                <div style={{ aspectRatio, width: '100%', maxWidth: layout === 'full' ? '100%' : '80%', overflow: 'hidden', borderRadius: '8px' }}>
                    {isDirectFile ? (
                        <video
                            src={src}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            controls={controls}
                            autoPlay={autoPlay}
                            muted={autoPlay}
                            loop={autoPlay}
                        />
                    ) : (
                        <iframe
                            src={src}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allowFullScreen
                            title="Video"
                        />
                    )}
                </div>
            ) : (
                <div
                    style={{
                        width: '100%',
                        maxWidth: layout === 'full' ? '100%' : '80%',
                        aspectRatio,
                        borderRadius: '8px',
                        background: 'hsl(var(--muted))',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--muted-foreground))',
                    }}
                    className="gap-2"
                >
                    <VideoIcon className="h-8 w-8 text-muted-foreground/50" />
                    <span className="text-sm font-medium">Video auswählen (in Einstellungen)</span>
                </div>
            )}
        </div>
        </NodeWrapper>
    );
};

const CraftVideoSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props as CraftVideoProps }));
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `course-videos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('course-media')
                .getPublicUrl(filePath);

            setProp((p: any) => p.src = publicUrl);
        } catch (error) {
            console.error('Error uploading video:', error);
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-md border border-border/50 space-y-3">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Videoquelle</label>

                <div>
                    <Button variant="outline" size="sm" className="w-full gap-2 relative overflow-hidden" disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isUploading ? 'Lade hoch...' : 'MP4 hochladen'}
                        <input
                            type="file"
                            accept="video/mp4,video/webm"
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

                <input type="text" value={props.src || ''} onChange={(e) => setProp((p: any) => p.src = e.target.value)} placeholder="https://youtube.com/embed/..." className="w-full h-8 px-2 text-xs border border-border rounded bg-background" />
                <p className="text-[10px] text-muted-foreground">YouTube/Vimeo Embed-URL oder mp4 Link</p>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Layout-Größe</label>
                    <select value={props.layout || 'standard'} onChange={(e) => setProp((p: any) => p.layout = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                        <option value="full">Volle Breite (100%)</option>
                        <option value="standard">Standard (80%)</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-medium text-muted-foreground">Seitenverhältnis</label>
                    <select value={props.aspectRatio || '16/9'} onChange={(e) => setProp((p: any) => p.aspectRatio = e.target.value)} className="w-full h-8 px-2 text-xs border border-border rounded bg-background mt-1">
                        <option value="16/9">16:9 (Quer)</option>
                        <option value="4/3">4:3 (Klassisch)</option>
                        <option value="1/1">1:1 (Quadratisch)</option>
                        <option value="9/16">9:16 (Vertikal)</option>
                    </select>
                </div>

                {props.src?.includes('supabase.co') && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={props.controls} onChange={(e) => setProp((p: any) => p.controls = e.target.checked)} className="rounded border-border text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">Steuerelemente (Play/Pause) anzeigen</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={props.autoPlay} onChange={(e) => setProp((p: any) => p.autoPlay = e.target.checked)} className="rounded border-border text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">Autoplay (Stumm & Endlos-Loop)</span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

CraftVideo.craft = {
    displayName: 'Video',
    props: { src: '', aspectRatio: '16/9', layout: 'standard', autoPlay: false, controls: true, customWidth: '', customHeight: '' },
    related: { settings: CraftVideoSettings },
};
