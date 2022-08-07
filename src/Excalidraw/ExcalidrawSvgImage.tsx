import React, {
    useEffect,
    useMemo,
    useRef,
} from "react";
import { useTheme } from "@mui/material";
import { exportToSvg } from "@excalidraw/excalidraw";
import { useAppSelector } from "../store/hooks";
import useFiles from "./hooks/useFiles";
import { THEME } from "@excalidraw/excalidraw";
interface DrawingPageProps {
    drawingName: string;
    height?: string;
    width?: string;
}

const ExcalidrawSvgImage: React.FC<DrawingPageProps> = React.memo(
    ({
        drawingName,
        height,
        width
    }) => {
        const currDrawing = useAppSelector(
            state => state.drawings[drawingName]?.drawing
        );
        const files = useFiles(drawingName);
        const isDark = useTheme().palette.mode === 'dark';
        const initialData = useMemo(() => {
            return {
                files,
                elements: currDrawing?.elements ?? [],
                appState: {
                    viewBackgroundColor: "transparent",
                    exportWithDarkMode: isDark,
                    theme: isDark ? THEME.DARK : THEME.LIGHT
                },
            };
        }, [currDrawing?.elements, files, isDark]);
        
        const el = useRef<HTMLDivElement>(null);
        useEffect(() => {
            const divEl = el.current;
            let svgEl: SVGSVGElement | undefined;
            const getSvg = async () => {
                const svg = await exportToSvg(initialData,)
                svg.style.height = height ?? 'auto';
                svg.style.width = width ?? '100%';
                svgEl = svg;
                divEl?.appendChild?.(svg);
            }
            getSvg();
            return () => {
                if (svgEl) {
                    divEl?.removeChild(svgEl);
                }
            }
        }, [initialData, height, width])

        return <div ref={el}/>;
    }
);
export default ExcalidrawSvgImage;