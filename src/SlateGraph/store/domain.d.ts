import { Node } from 'slate';

export type ReferenceElement = {
    type: "reference";
    docReference: string;
    children: SlateNode[];
  } & Node;
export type PortalElement = {
    type: "portal";
    portalReference: string;
    children: SlateNode[];
} & Node;

export type SlateNode = Node | ReferenceElement | PortalElement;