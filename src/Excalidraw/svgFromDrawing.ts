import { exportToSvg } from "@excalidraw/excalidraw";
import { THEME } from "@excalidraw/excalidraw";
import { Store } from "@reduxjs/toolkit";
import createFilesForDrawingSelector from "../UploadedFiles/filesForDrawingSelector";
import { RootState } from "../store/configureStore";

export const getDrawingSvgB64 = async (store: Store<RootState>, drawingName: string, isDark: boolean) => {
    const drawing = store.getState().drawings[drawingName]?.drawing;
    const files = createFilesForDrawingSelector()(store.getState(), drawingName)
    const data = {
        files,
        elements: drawing?.elements ?? [],
        appState: {
            viewBackgroundColor: "transparent",
            exportWithDarkMode: isDark,
            theme: isDark ? THEME.DARK : THEME.LIGHT
        },
    }
    const svg = await exportToSvg(data)
    // Serialize the svg to string
    const svgString = new XMLSerializer().serializeToString(svg);

    // Remove any characters outside the Latin1 range
    const decoded = unescape(encodeURIComponent(svgString));

    // Now we can use btoa to convert the svg to base64
    const base64 = btoa(decoded);

    const b64 = `data:image/svg+xml;base64,${base64}`;
    return b64;
}

class DrawingSvgStore {
    private generatedData: {
        [drawingName: string]: {
            lastHash: string;
            isDark: boolean;
            svgB64: string;
        }
    } = {};
    private callbacks: {
        [drawingName: string]: ((svgB64: string) => void)[];
    } = {};
    private getDrawingSvg = async (store: Store<RootState>, drawingName: string, isDark: boolean) => {
        const current = store.getState().drawings[drawingName];
        const existing = this.generatedData[drawingName];
        if (!existing || existing.lastHash !== current.drawingHash || existing.isDark !== isDark) {
            const newEntry = await getDrawingSvgB64(store,drawingName, isDark);
            this.generatedData[drawingName] = {
                lastHash: current.drawingHash,
                isDark,
                svgB64: newEntry
            }
        }
        return this.generatedData[drawingName].svgB64
    }
    // this needs to be cancellable and caching.
    /**
     * 
     TODO:
     Add an Error Handling callback!
     */
    subscribeToSvg(store: Store<RootState>, drawingName: string, isDark: boolean, cb: (svgB64: string) => void) {
        if (!this.callbacks[drawingName]) {
            this.callbacks[drawingName] = []
        }
        this.callbacks[drawingName].push(cb);
        this.getDrawingSvg(store, drawingName, isDark).then(svgB64 => {
            this.callbacks[drawingName]?.forEach(_cb => _cb(svgB64));
        })
        return () => {
            // unsubscribe
            this.callbacks[drawingName] = this.callbacks[drawingName]?.filter(_cb => _cb !== cb);
            if (!this.callbacks[drawingName]?.length) {
                delete this.callbacks[drawingName];
            }
        }
    }
}
const drawingSvgStore = new DrawingSvgStore();
export { drawingSvgStore };