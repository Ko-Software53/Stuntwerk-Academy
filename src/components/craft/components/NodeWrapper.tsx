import React, { useCallback, useRef } from 'react';
import { useNode } from '@craftjs/core';

interface NodeWrapperProps {
    children: React.ReactNode;
    connect: (ref: HTMLElement) => void;
    drag: (ref: HTMLElement) => void;
}

const HANDLE_SIZE = 8;
const HANDLE_OFFSET = -(HANDLE_SIZE / 2);
const BORDER_COLOR = '#3b82f6';
const HOVER_COLOR = '#93c5fd';

const handlePositions = [
    { key: 'tl', top: HANDLE_OFFSET, left: HANDLE_OFFSET, cursor: 'nwse-resize' },
    { key: 'tr', top: HANDLE_OFFSET, right: HANDLE_OFFSET, cursor: 'nesw-resize' },
    { key: 'bl', bottom: HANDLE_OFFSET, left: HANDLE_OFFSET, cursor: 'nesw-resize' },
    { key: 'br', bottom: HANDLE_OFFSET, right: HANDLE_OFFSET, cursor: 'nwse-resize' },
] as const;

export const NodeWrapper = ({ children, connect, drag }: NodeWrapperProps) => {
    const {
        selected,
        hovered,
        actions: { setProp },
        customWidth,
        customHeight,
    } = useNode((node) => ({
        selected: node.events.selected,
        hovered: node.events.hovered,
        customWidth: node.data.props.customWidth as string | undefined,
        customHeight: node.data.props.customHeight as string | undefined,
    }));

    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleResizeStart = useCallback(
        (corner: string, e: React.PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = wrapperRef.current?.offsetWidth || 0;
            const startHeight = wrapperRef.current?.offsetHeight || 0;

            const onMove = (moveEvent: PointerEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;

                let newWidth = startWidth;
                let newHeight = startHeight;

                if (corner.includes('r')) newWidth = startWidth + deltaX;
                if (corner.includes('l')) newWidth = startWidth - deltaX;
                if (corner.includes('b')) newHeight = startHeight + deltaY;
                if (corner.includes('t')) newHeight = startHeight - deltaY;

                newWidth = Math.max(40, newWidth);
                newHeight = Math.max(20, newHeight);

                setProp((p: any) => {
                    p.customWidth = `${Math.round(newWidth)}px`;
                    p.customHeight = `${Math.round(newHeight)}px`;
                });
            };

            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        },
        [setProp]
    );

    return (
        <div
            ref={(ref) => {
                if (ref) {
                    connect(drag(ref));
                    (wrapperRef as React.MutableRefObject<HTMLDivElement>).current = ref;
                }
            }}
            style={{
                position: 'relative',
                ...(customWidth ? { width: customWidth } : {}),
                ...(customHeight ? { height: customHeight } : {}),
            }}
        >
            {children}

            {/* Selection / hover overlay */}
            {(selected || hovered) && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        border: selected
                            ? `2px solid ${BORDER_COLOR}`
                            : `1px dashed ${HOVER_COLOR}`,
                        borderRadius: 2,
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}
                />
            )}

            {/* Resize handles */}
            {selected &&
                handlePositions.map((pos) => (
                    <div
                        key={pos.key}
                        onPointerDown={(e) => handleResizeStart(pos.key, e)}
                        style={{
                            position: 'absolute',
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            background: BORDER_COLOR,
                            border: '1px solid white',
                            borderRadius: 1,
                            cursor: pos.cursor,
                            zIndex: 20,
                            top: 'top' in pos ? pos.top : undefined,
                            bottom: 'bottom' in pos ? pos.bottom : undefined,
                            left: 'left' in pos ? pos.left : undefined,
                            right: 'right' in pos ? pos.right : undefined,
                        }}
                    />
                ))}
        </div>
    );
};
