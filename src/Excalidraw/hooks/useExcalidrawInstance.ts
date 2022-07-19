import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useCallback, useEffect, useState } from "react";

const useExcalidrawInstance = () => {
    const [excalidrawInstance, setExcalidrawInstance] = useState<ExcalidrawImperativeAPI | null>(null);
    const excalidrawRef = useCallback((node: ExcalidrawImperativeAPI | null) => {
        if (node !== null) {
            setExcalidrawInstance(node);
        }
    }, []);

    useEffect(() => {
        if (!excalidrawInstance) {
            return;
        }
        let to: NodeJS.Timeout | null = null;
        excalidrawInstance.readyPromise.then(instance => {
            to = setTimeout(() => {
                instance.refresh();
            }, 350)
        })
        return () => {
            if (to) {
                clearTimeout(to);
            }
        }
    }, [excalidrawInstance])

    return {
        excalidrawRef,
        excalidrawInstance,
    }
}

export default useExcalidrawInstance;