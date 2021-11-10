import React, { useCallback, useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { registerHeightObserver, unregisterHeightObserver } from 'element-height-observer/dist/index';
import { Portal } from '@mui/core';
import { useMediaQuery } from '@mui/material';

const UniversalSticky: React.FC<{ isFocused: boolean; renderToolbar: () => JSX.Element }> = ({
    isFocused,
    renderToolbar,
    children
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
                setStyle({
                    top: newTop,
                    position: 'absolute',
                    zIndex: 2004,
                    left: thisRectRef.current?.x ?? 0,
                    width: thisRectRef.current ? thisRectRef.current.width + 'px' : undefined,
                    display: undefined,
                })
            } else {
                const left = windowOffsetLeftRef.current;
                setStyle({
                    top: newTop,
                    position: 'absolute',
                    zIndex: 2004,
                    left,
                    width: '100vw',
                    display: undefined,
                })
            }
        } else {
            setStyle({
                position: undefined,
                display: 'none',
                width: undefined,
                zIndex: undefined
            })
        }
    }, [getTopPos, setStyle, large])
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