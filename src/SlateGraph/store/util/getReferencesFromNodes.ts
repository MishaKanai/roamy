import { Descendant } from "slate"
import { RemoteFiles } from "../../../RemoteFiles/remoteFilesSlice"
import { PortalElement, ReferenceElement, RemoteFileElement, CustomElement } from "../../slate"


const isReference = (node: Descendant): node is ReferenceElement => {
    return (node as CustomElement).type === 'reference'
}
const isPortal = (node: Descendant): node is PortalElement => {
    return (node as CustomElement).type === 'portal'
}
const isRemoteFile = (node: Descendant): node is RemoteFileElement => {
    return (node as CustomElement).type === 'remotefile'
}

export const addRemoteFileCount = (remoteFiles: RemoteFiles, fileIdentifier: string, count = 1) => {
    if (!remoteFiles[fileIdentifier]) {
        remoteFiles[fileIdentifier] = {
            count: 0
        }
    }
    remoteFiles[fileIdentifier].count += count;
}
export const getRemoteFilesFromNodes = (nodes: Descendant[]): RemoteFiles => {
    let remoteFiles: RemoteFiles = {}
    
    nodes.forEach(n => {
        if (isRemoteFile(n)) {
            addRemoteFileCount(remoteFiles, n.fileIdentifier)
        }
        if ((n as any).children) {
            Object.entries(getRemoteFilesFromNodes((n as any).children as Descendant[])).forEach(([fileId, { count }]) => {
                addRemoteFileCount(remoteFiles, fileId, count)
            })
        }
    })
    return remoteFiles;
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