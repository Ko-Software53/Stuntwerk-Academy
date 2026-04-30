import React from 'react';
import { Editor, Frame, Element } from '@craftjs/core';
import { CraftContainer } from './components/CraftContainer';
import { CraftColumns } from './components/CraftColumns';
import { CraftText } from './components/CraftText';
import { CraftHeading } from './components/CraftHeading';
import { CraftImage } from './components/CraftImage';
import { CraftVideo } from './components/CraftVideo';
import { CraftSpacer } from './components/CraftSpacer';
import { CraftDivider } from './components/CraftDivider';
import { CraftButton } from './components/CraftButton';

const resolver = {
    CraftContainer,
    CraftColumns,
    CraftText,
    CraftHeading,
    CraftImage,
    CraftVideo,
    CraftSpacer,
    CraftDivider,
    CraftButton,
};

interface CraftRendererProps {
    data: string;
}

export function CraftRenderer({ data }: CraftRendererProps) {
    if (!data) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                Kein Inhalt verfügbar.
            </div>
        );
    }

    return (
        <Editor resolver={resolver} enabled={false}>
            <Frame data={data}>
                <Element is={CraftContainer} canvas padding={0} minHeight={0} background="transparent">
                </Element>
            </Frame>
        </Editor>
    );
}
