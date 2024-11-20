import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store/configureStore";
import { LinkObject, NodeObject } from "react-force-graph-3d";
import { SlateDocument } from "../SlateGraph/store/slateDocumentsSlice";
import { DrawingDocument } from "../Excalidraw/store/drawingsSlice";

type DocCacheEntry<T extends SlateDocument | DrawingDocument> = {
  docSnapshot: T;
  node: NodeObject;
};
export const createGraphSelector = () => {
  const nodeCache: Map<
    string,
    DocCacheEntry<SlateDocument | DrawingDocument>
  > = new Map();
  const updateNodeCache = <T extends SlateDocument | DrawingDocument>(
    id: string,
    candidateEntry: DocCacheEntry<T>,
    shouldUpdate: (prevDoc: T) => boolean
  ): NodeObject => {
    const cacheEntry = nodeCache.get(id) as DocCacheEntry<T>;

    if (
      !cacheEntry?.node || // No cached node exists
      shouldUpdate(cacheEntry.docSnapshot)
    ) {
      nodeCache.set(id, candidateEntry); // Update cache
    }
    return nodeCache.get(id)?.node!;
  };

  let prevNodes: NodeObject[] = [];
  let prevLinks: LinkObject[] = [];
  return createSelector(
    (state: RootState) => state.documents,
    (state: RootState) => state.drawings,
    (state: RootState) => state.categories,
    (documents, drawings, categories) => {
      let nodes: NodeObject[] = [];
      let links: LinkObject[] = [];

      Object.values(documents).forEach((doc) => {
        // doc.documentHash
        // doc.backReferencesHash
        // doc.backReferencesHash

        const color =
          (doc.categoryId && categories[doc.categoryId]?.color) ?? undefined;
        const docNode = {
          id: doc.name,
          label: doc?.displayName ?? doc?.name,
          type: "document",
          color,
        };
        nodes.push(
          updateNodeCache<SlateDocument>(
            doc.name,
            {
              docSnapshot: doc,
              node: docNode,
            },
            (cachedDocSnapshot) =>
              cachedDocSnapshot.backReferencesHash !== doc.backReferencesHash ||
              cachedDocSnapshot.categoryId !== doc.categoryId ||
              cachedDocSnapshot.displayName !== doc.displayName ||
              cachedDocSnapshot.referencesHash !== doc.referencesHash
          )
        );

        doc.references.forEach((ref) => {
          if (!documents[ref]) {
            console.error(
              `ref from ${doc.name} ${
                doc.displayName && "(" + doc.displayName + ")"
              } to nonextistent doc ${ref}`
            );
            return;
          }
          links.push({ source: doc.name, target: ref });
        });
      });

      Object.values(drawings).forEach((drawing) => {
        const drawingNode = {
          id: "drawing:" + drawing.name,
          label: drawing?.displayName ?? drawing?.name,
          type: "drawing",
        };
        nodes.push(
          updateNodeCache<DrawingDocument>(
            drawing.name,
            {
              docSnapshot: drawing,
              node: drawingNode,
            },
            (cachedDocSnapshot) =>
              cachedDocSnapshot.backReferencesHash !==
                drawing.backReferencesHash ||
              cachedDocSnapshot.displayName !== drawing.displayName ||
              cachedDocSnapshot.drawingHash !== drawing.drawingHash
          )
        );

        drawing.backReferences.forEach((br) => {
          links.push({ source: br, target: "drawing:" + drawing.name });
        });
      });

      if (
        prevNodes.length === nodes.length &&
        prevNodes.every((n, i) => n === nodes[i])
      ) {
        nodes = prevNodes;
      } else {
        prevNodes = nodes;
      }

      for (let i = 0; i < links.length; i++) {
        const prevSource = prevLinks[i]?.source;
        const prevTarget = prevLinks[i]?.target;
        if (
          (typeof prevSource === "object" && prevSource
            ? prevSource.id
            : prevSource + "") === links[i].source &&
          (typeof prevTarget === "object" && prevTarget
            ? prevTarget.id
            : prevTarget + "") === links[i].target
        ) {
          links[i] = prevLinks[i];
        }
      }
      if (
        prevLinks.length === links.length &&
        prevLinks.every((n, i) => n === links[i])
      ) {
        links = prevLinks;
      } else {
        prevLinks = links;
      }

      return { nodes, links };
    }
  );
};
