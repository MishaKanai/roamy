import { SlateNode, ReferenceElement, PortalElement } from "../domain";

const isReference = (node: SlateNode): node is ReferenceElement => {
    return node.type === 'reference'
}
const isPortal = (node: SlateNode): node is PortalElement => {
    return node.type === 'portal'
}

const getReferencesFromNodes = (nodes: SlateNode[]): Set<string> => {
    let references = new Set<string>();
    nodes.forEach(n => {
        if (isReference(n)) {
            references.add(n.docReference);
        }
        if (isPortal(n)) {
            references.add(n.portalReference);
        }
        if (n.children) {
            getReferencesFromNodes(n.children as SlateNode[]).forEach(r => {
                references.add(r)
            });
        }
    })
    return references;
}
export default getReferencesFromNodes;