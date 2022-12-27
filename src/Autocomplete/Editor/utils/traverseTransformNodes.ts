import { CustomElement, CustomText } from "../../../SlateGraph/slate";

export const nodeIsText = (node: CustomElement | CustomText): node is CustomText => !(node as any).type && typeof (node as any).text !== 'undefined';

export const traverseTransformNodes = (cb: (node: (CustomElement | CustomText), path: string) => CustomElement | null) => {
  const innerTraverse = (slateNodes: (CustomElement | CustomText)[], currPath = ''): (CustomElement | CustomText)[] => {
    return slateNodes.map((node, i): CustomElement | CustomText => {
      const pathToNode = `${currPath}[${i}]`
      const result = cb(node, pathToNode);
      if (result) {
        return result
      }
      if (nodeIsText(node)) {
        return node;
      }
      if ((node as any).children) {
        switch (node.type) {
          case 'bulleted-list':
          case 'numbered-list':
            return {
              ...node,
              children: node.children.map(({ children }, i) => {
                const path = `${pathToNode}.children[${i}].children`
                return innerTraverse(children, path)
              }) as any[]
            }
          case 'portal':
          case 'reference':
          case 'drawing': 
          case 'image':
            return node;
          default:
            return {
              ...node,
              children: innerTraverse(node.children, pathToNode + '.children') as any[]
            }
        }
      }
      return node;
    });
  }
  return (nodes: (CustomElement | CustomText)[]) => innerTraverse(nodes);
}