import { SlateNode, DrawingElement } from "../../../SlateGraph/store/domain";

const isDrawing = (node: SlateNode): node is DrawingElement => {
    return (node as any).type === 'drawing'
}

const getDrawingsFromNodes = (nodes: SlateNode[]): Set<string> => {
    let references = new Set<string>();
    nodes.forEach(n => {
        if (isDrawing(n)) {
            references.add(n.drawingReference);
        }
        if ((n as any).children) {
            getDrawingsFromNodes((n as any).children as SlateNode[]).forEach(r => {
                references.add(r)
            });
        }
    })
    return references;
}
export default getDrawingsFromNodes;