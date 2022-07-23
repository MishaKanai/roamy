import { DrawingDocuments } from "../../Excalidraw/store/drawingsSlice";

const getFilesToDrawings = (drawings: DrawingDocuments) => {
    return Object.entries(drawings).flatMap(([drawingKey, drawing]) => {
        return drawing.drawing.filesIds.map(fid => [fid, drawingKey])
    }).reduce((prev, [fid, drawingKey]) => {
        if (!prev[fid]) {
            prev[fid] = []
        }
        prev[fid].push(drawingKey);
        return prev;
    }, {} as { [fileId: string]: string[] })
}
export default getFilesToDrawings;