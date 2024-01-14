import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useCallback, useEffect, useState } from "react";

const useExcalidrawInstance = () => {
  const [excalidrawInstance, setExcalidrawInstance] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const excalidrawRef = useCallback((node: ExcalidrawImperativeAPI | null) => {
    if (node !== null) {
      setExcalidrawInstance(node);
    }
  }, []);

  useEffect(() => {
    if (!excalidrawInstance) {
      return;
    }
    let to1: ReturnType<typeof setTimeout> | null = null;
    let to2: ReturnType<typeof setTimeout> | null = null;
    excalidrawInstance.readyPromise.then((instance) => {
      /**
       * for some reason, with multiple exalidraw instances of the same image, they frequently don't appear until we force refresh, and the timing needed for that is very inconsistent
       */
      setImmediate(() => {
        instance.refresh();
      });
      to1 = setTimeout(() => {
        instance.refresh();
      }, 750);
      to2 = setTimeout(() => {
        instance.refresh();
      }, 1500);
    });
    return () => {
      if (to1) {
        clearTimeout(to1);
      }
      if (to2) {
        clearTimeout(to2);
      }
    };
  }, [excalidrawInstance]);

  return {
    excalidrawRef,
    excalidrawInstance,
  };
};

export default useExcalidrawInstance;
