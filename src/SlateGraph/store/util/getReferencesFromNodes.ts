import { Descendant } from "slate"
import { PortalElement, ReferenceElement } from "../../slate"


const isReference = (node: Descendant): node is ReferenceElement => {
    return (node as any).type === 'reference'
}
const isPortal = (node: Descendant): node is PortalElement => {
    return (node as any).type === 'portal'
}

const getReferencesFromNodes = (nodes: Descendant[]): Set<string> => {
    let references = new Set<string>();
    nodes.forEach(n => {
        if (isReference(n)) {
            references.add(n.docReference);
        }
        if (isPortal(n)) {
            references.add(n.portalReference);
        }
        if ((n as any).children) {
            getReferencesFromNodes((n as any).children as Descendant[]).forEach(r => {
                references.add(r)
            });
        }
    })
    return references;
}
export default getReferencesFromNodes;