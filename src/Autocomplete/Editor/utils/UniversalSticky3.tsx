import React, { useCallback, useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { registerHeightObserver, unregisterHeightObserver } from 'element-height-observer/dist/index';
import { Portal } from '@mui/core';
import { useMediaQuery } from '@mui/material';

type WriteStyles = (setStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>, domRef: React.MutableRefObject<HTMLDivElement | null>, style: React.CSSProperties) => void;

export const reactWriter: WriteStyles = (setStyle, domRef, style) => {
    setStyle(style);
};
const domWriter: WriteStyles = (setStyle, domRef, style) => {
    requestAnimationFrame(() => {
        if (!domRef.current) {
            return;
        }
        const currStyle = domRef.current.style;
        if ((currStyle.position ?? '') !== (style.position ?? '')) {
            domRef.current.style.position = style.position ?? '';
        }
        if (style.position === 'absolute' && typeof style.top === 'string' && currStyle.top !== style.top) {
            domRef.current.style.top = style.top;
        }
        if ((currStyle.zIndex ?? '') !== '' + (style.zIndex ?? '')) {
            domRef.current.style.zIndex = '' + (style.zIndex ?? '');
        }
        if ((currStyle.left ?? '') !== (typeof style.left === 'number' ? style.left + 'px' : (style.left ?? ''))) {
            domRef.current.style.left = typeof style.left === 'number' ? style.left + 'px' : ''
        }
        if ((currStyle.width ?? '') !== (style.width ?? '')) {
            domRef.current.style.width = (typeof style.width === 'number') ? style.width + 'px' : (style.width ?? '')
        }
        if ((currStyle.display ?? '') !== (style.display ?? '')) {
            domRef.current.style.display = (typeof style.display === 'string') ? style.display : ''
        }
    })
}
const UniversalSticky: React.FC<{
    isFocused: boolean;
    renderToolbar: () => JSX.Element
    // this is exposed so we can write styles directly to the DOM using requestAnimationFrame for better perf.
    writeStyles?: WriteStyles
}> = ({
    isFocused,
    renderToolbar,
    children,
    writeStyles = domWriter// reactWriter
}) => {
    const divRef = useRef<HTMLDivElement | null>(null)
    const thisRectRef = useRef<DOMRect | null>(null);
    const tabListRef = useRef<HTMLDivElement | null>(null);
    const tabListRectRef = useRef<DOMRect | null>(null);
    const panesRef = useRef<any>(null);
    const panesClientHeightRef = useRef<number>(0);
    const _isMountedRef = useRef(false);
    const windowOffsetTopRef = useRef(0);
    const windowOffsetLeftRef = useRef(0);
    const large = useMediaQuery('(min-width:600px)');
    
    const [style, setStyle] = useState<React.CSSProperties>({ display: 'none' });
    const getDomInfo = useCallback(() => {
        if (_isMountedRef.current) {
            if (divRef.current) {
                thisRectRef.current = divRef.current.getBoundingClientRect();
            }
            if (tabListRef.current) {
                tabListRectRef.current = tabListRef.current.getBoundingClientRect();
            }
            if (panesRef.current) {
                panesClientHeightRef.current = panesRef.current.clientHeight;
            }
        }
    }, [])
    const getTopPos = useCallback(() => {
        if (!thisRectRef.current) {
            return null;
        }
        return thisRectRef.current.top <= 0 &&
            thisRectRef.current.top + panesClientHeightRef.current >= 0 ? windowOffsetTopRef.current : null;
    }, [])
    
    const writePos = useCallback(() => {
        const topPos = getTopPos();
        if (topPos !== null) {
            const newTop = topPos !== null ? topPos + 'px' : '';
            if (large) {
                writeStyles(setStyle, tabListRef, {
                    top: newTop,
                    position: 'absolute',
                    zIndex: 2004,
                    left: thisRectRef.current?.x ?? 0,
                    width: thisRectRef.current ? thisRectRef.current.width + 'px' : undefined,
                    display: undefined,
                })
            } else {
                const left = windowOffsetLeftRef.current;
                writeStyles(setStyle, tabListRef, {
                    top: newTop,
                    position: 'absolute',
                    zIndex: 2004,
                    left,
                    width: '100vw',
                    display: undefined,
                })
            }
        } else {
            writeStyles(setStyle, tabListRef, {
                position: undefined,
                display: 'none',
                width: undefined,
                zIndex: undefined
            })
        }
    }, [getTopPos, writeStyles, setStyle, large])
    const handleScroll = useCallback(() => {
        getDomInfo()
        let top = window.pageYOffset || document!.documentElement!.scrollTop;
        if (_isMountedRef.current) {
            windowOffsetTopRef.current = top
            windowOffsetLeftRef.current = window.scrollX;
        }

        writePos();
    }, [getDomInfo, writePos])
    useEffect(() => {
        _isMountedRef.current = true;
        window.addEventListener('scroll', handleScroll);
        getDomInfo();
        const debouncedOnScrollFn = debounce(() => {
            getDomInfo();
            writePos()
        }, 75);
        registerHeightObserver(document.getElementsByTagName('body')[0], { direction: 'both' }, debouncedOnScrollFn);
        (document.getElementsByClassName('element-height-observer-iframe')[0] as any).title =
            'element-height-observer-iframe';
        return () => {
            _isMountedRef.current = false;
            if (debouncedOnScrollFn) {
                debouncedOnScrollFn.cancel();
            }
            window.removeEventListener('scroll', handleScroll);
            unregisterHeightObserver(document.getElementsByTagName('body')[0]);
        }
    }, [getDomInfo, handleScroll, writePos])

    useEffect(() => {
        handleScroll()
    }, [isFocused, handleScroll])
    return <div>
        <div
            ref={divRef}
            style={{ width: '100%' }}
        >
            <div>
                <div style={style.position === 'absolute' ? { visibility: 'hidden'} : undefined}>{renderToolbar()}</div>
                {isFocused ? (<Portal>
                    <div
                        ref={tabListRef}
                        style={style}
                    >
                        {renderToolbar()}
                    </div>
                </Portal>) : null}
                <div
                    ref={panesRef}
                    style={{ width: '100%' }}
                >
                    {children}
                </div>
            </div>
        </div>
    </div>
}

export default UniversalSticky