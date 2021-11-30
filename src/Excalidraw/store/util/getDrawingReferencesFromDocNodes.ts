import { Descendant } from "slate";
import { DrawingElement } from "../../../SlateGraph/slate";


const isDrawing = (node: Descendant): node is DrawingElement => {
    return (node as any).type === 'drawing'
}

const getDrawingsFromNodes = (nodes: Descendant[]): Set<string> => {
    let references = new Set<string>();
    nodes.forEach(n => {
        if (isDrawing(n)) {
            references.add(n.drawingReference);
        }
        if ((n as any).children) {
            getDrawingsFromNodes((n as any).children as Descendant[]).forEach(r => {
                references.add(r)
            });
        }
    })
    return references;
}
export default getDrawingsFromNodes;