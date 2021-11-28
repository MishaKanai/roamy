import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
/*
    When we mount Drawings, we register our excalidraw instances here.
    This way if we have Drawings updated from external sources
    (e.g. multiple instances of the same drawing on the same page)
    they can be updating when 'onBlur' is triggered on the drawing currently being edited.

    Doing it completely in sync would be nice,
    but it appears not to work due to Excalidraw's implementation.
*/

const excalidrawRegistry: {
    [drawingName: string]: {
        [id: string]: {
            instance: ExcalidrawImperativeAPI;
        }
    }
} = {}

export const register = (drawingName: string, id: string, instance: ExcalidrawImperativeAPI) => {
    if (!excalidrawRegistry[drawingName]) {
        excalidrawRegistry[drawingName] = {};
    }
    excalidrawRegistry[drawingName][id] = { instance };
}
export const unregister = (drawingName: string, id: string) => {
    if (excalidrawRegistry[drawingName]?.[id]) {
        delete excalidrawRegistry[drawingName][id];
    }
    if (excalidrawRegistry[drawingName] && Object.keys(excalidrawRegistry[drawingName]).length === 0) {
        delete excalidrawRegistry[drawingName];
    }
}
export const triggerSync = (drawingName: string, triggeredFromId: string, newScene: Parameters<ExcalidrawImperativeAPI['updateScene']>[0]) => {
    if (excalidrawRegistry[drawingName]) {
        Object.entries(excalidrawRegistry[drawingName]).forEach(([id, { instance }]) => {
            if (id !== triggeredFromId) {
                instance.updateScene(newScene)
            }
        })
    }
}