import React, {
    useEffect,
    useMemo,
    useRef,
} from "react";
import { useTheme } from "@mui/material";
import { exportToSvg } from "@excalidraw/excalidraw";
import { useAppSelector } from "../store/hooks";

interface DrawingPageProps {
    drawingName: string;
}

const ExcalidrawSvgImage: React.FC<DrawingPageProps> = React.memo(
    ({
        drawingName,
    }) => {
        const currDrawing = useAppSelector(
            state => state.drawings[drawingName]?.drawing
        );
        const initialData = useMemo(() => {
            return {
                files: null,
                elements: currDrawing?.elements ?? [],
                appState: {
                    viewBackgroundColor: "transparent",
                },
            };
        }, [currDrawing.elements]);
        const isDark = useTheme().palette.mode === 'dark';
        const el = useRef<HTMLDivElement>(null);
        useEffect(() => {
            const divEl = el.current;
            let svgEl: SVGSVGElement | undefined;
            const getSvg = async () => {
                const svg = await exportToSvg(initialData)
                svg.style.height = 'auto';
                svg.style.width = '100%';
                svgEl = svg;
                divEl?.appendChild?.(svg);
            }
            getSvg();
            return () => {
                if (svgEl) {
                    divEl?.removeChild(svgEl);
                }
            }
        }, [initialData])

        const styles = useMemo(() => {
            return isDark ? { filter: 'invert(100%) hue-rotate(180deg)' } : undefined
        }, [isDark]);

        return <div style={styles} ref={el}/>;
    }
);
export default ExcalidrawSvgImage;