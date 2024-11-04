import Graph from "react-vis-graph-wrapper/dist";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Theme, useTheme } from "@mui/material";
import { createSelector } from "reselect";
import Search, { HighlightedSearchResults } from "../Search/components/Search";
import { useAppSelector } from "../store/hooks";
import { RootState } from "../store/configureStore";
import { useStore } from "react-redux";
import { drawingSvgStore } from "../Excalidraw/svgFromDrawing";

const getOptions = (theme: Theme) => {
  const contrastTextColor = theme.palette.getContrastText(
    theme.palette.background.default
  );
  const nodeColor = theme.palette.background.paper;
  return {
    layout: {
      hierarchical: false,
    },
    nodes: {
      shape: "dot",
      color: {
        border: theme.palette.getContrastText(theme.palette.background.paper),
        background: theme.palette.primary.light,
        highlight: {
          border: theme.palette.getContrastText(theme.palette.background.paper),
        },
      },
      font: {
        face: theme.typography.fontFamily,
        color: theme.palette.getContrastText(nodeColor),
      },
    },
    edges: {
      color: contrastTextColor,
    },
  };
};

type NodeType = "drawing" | "document";

type GraphNode = {
  id: string;
  label: string;
  type?: NodeType | undefined;
  color?: any;
  font?: {
    color?: string;
  };
};
type GraphDescription = {
  nodes: GraphNode[];
  edges: {
    from: string;
    to: string;
    toType?: NodeType | undefined;
  }[];
};
const createGraphSelector = () =>
  createSelector(
    (state: RootState) => state.documents,
    (state: RootState) => state.drawings,
    (state: RootState) => state.categories,
    (documents, drawings, categories): GraphDescription => {
      const nodes: GraphNode[] = [];
      const edges: { from: string; to: string; toType?: NodeType }[] = [];
      Object.values(documents).forEach((doc) => {
        const background =
          (doc.categoryId && categories[doc.categoryId]?.color) ?? undefined;
        nodes.push({
          id: doc.name,
          label: doc?.displayName ?? doc?.name,
          type: "document",
          font: background
            ? {
                color: background,
              }
            : !doc?.displayName
            ? {
                color: "grey",
              }
            : undefined,
          color: {
            background,
            highlight: {
              background,
            },
          },
        });
        doc.references.forEach((ref) => {
          edges.push({
            from: doc.name,
            to: ref,
            toType: "document",
          });
        });
      });
      Object.values(drawings).forEach((drawing) => {
        nodes.push({
          id: "drawing:" + drawing.name,
          label: drawing?.displayName ?? drawing?.name,
          type: "drawing",
          font: !drawing?.displayName
            ? {
                color: "grey",
              }
            : undefined,
          color: {
            border: "grey",
            background: "transparent",
          },
          // can have drawings be a different color here.
        });
        drawing.backReferences.forEach((br) => {
          edges.push({
            from: br,
            to: "drawing:" + drawing.name,
            toType: "drawing",
          });
        });
      });
      return {
        nodes,
        edges,
      };
    }
  );
type FilterNode = (node: GraphNode) => boolean;
interface AppGraphProps {
  filterNode?: FilterNode;
  colorNode?: (node: GraphNode) => string | undefined;
}
const AppGraph = ({ filterNode }: AppGraphProps) => {
  const theme = useTheme();
  const edgesSelector = useMemo(() => createGraphSelector(), []);
  const { nodes: _nodes, edges } = useAppSelector(edgesSelector);
  const [nodes, setNewNodes] = useState(_nodes);
  const store = useStore<any>();
  const isDark = theme.palette.mode === "dark";
  useEffect(() => {
    const whenDone = (results: (string | null)[]) => {
      setNewNodes(
        _nodes.map((n, i) => {
          const r = results[i];
          if (!r) {
            return n;
          }
          return {
            ...n,
            shape: "image",
            image: {
              selected: r,
              unselected: r,
            },
          };
        })
      );
    };
    // -1 means unresolved
    // null means we don't need any data for this node index.
    // string is the generated svg base64 string

    // when an svg is generated, we check if we are done (no -1s) and if so, call 'whenDone' with the ready results
    let results: (string | null | -1)[] = _nodes.map((n) => -1);
    const cancels: (() => void)[] = [];
    _nodes.forEach((n, i) => {
      if (n.type === "drawing") {
        const id = n.id.slice("drawing:".length);
        const cancel = drawingSvgStore.subscribeToSvg(
          store,
          id,
          isDark,
          (svgB64) => {
            results[i] = svgB64;
            if (results.every((r) => r !== -1)) {
              whenDone(results as (string | null)[]);
            }
          }
        );
        cancels.push(cancel);
      } else {
        results[i] = null;
      }
    });
    return () => {
      cancels.forEach((cancel) => {
        cancel();
      });
    };
  }, [_nodes, store, isDark]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null); // State to track selected node
  const handleNodeClick = (event: { nodes: string[] }) => {
    const clickedNodeId = event.nodes[0];
    setSelectedNode((prev) => (prev === clickedNodeId ? null : clickedNodeId)); // Toggle selection
  };
  const { graph, events } = useMemo(() => {
    const directChildren = new Set<string>();
    const directParents = new Set<string>();
    if (selectedNode) {
      edges.forEach((edge) => {
        if (edge.from === selectedNode) {
          directChildren.add(edge.to); // Nodes connected *from* selectedNode are children
        }
        if (edge.to === selectedNode) {
          directParents.add(edge.from); // Nodes connected *to* selectedNode are parents
        }
      });
    }
    return {
      graph: {
        nodes: nodes.map((node) => {
          const isDirectChild = directChildren.has(node.id);
          const isDirectParent = directParents.has(node.id);
          const showLabel =
            !selectedNode ||
            selectedNode === node.id ||
            isDirectChild ||
            isDirectParent;
          return {
            ...node,
            label: showLabel ? node.label : "", // Hide labels based on selection
            font: {
              color: !selectedNode
                ? node?.font?.color
                : selectedNode === node.id
                ? theme.palette.text.primary // Regular color for selected node
                : isDirectChild
                ? theme.palette.primary.main // Grayed-out color for direct children
                : isDirectParent
                ? theme.palette.secondary.main
                : "transparent", // Hide other labels
            },
          };
        }),
        edges,
      },
      events: {
        select: ({ nodes, edges }: { nodes: string[]; edges: unknown }) => {
          handleNodeClick({ nodes });
        },
      },
    };
  }, [nodes, edges, selectedNode]);

  let filteredGraph = useMemo(() => {
    const { nodes, edges } = graph;
    if (filterNode) {
      let newNodes = nodes.filter((node) => filterNode(node));
      let newNodesObj = newNodes.reduce((prev, curr) => {
        prev[curr.id] = true;
        return prev;
      }, {} as { [k: string]: true });
      let newEdges = edges.filter(
        (edge) => newNodesObj[edge.from] && newNodesObj[edge.to]
      );
      return { nodes: newNodes, edges: newEdges };
    }
    return graph;
  }, [graph, filterNode]);
  /*
    TODO
    debounce listener to window resize, and remount when finished.
  */
  return (
    <div
      style={{
        height: "calc(100vh - calc(40px + 1em))",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Graph
        graph={filteredGraph}
        options={getOptions(theme)}
        events={events}
        style={{ height: "100vh" }}
      />
    </div>
  );
};
const ProvideFilterNode: React.FunctionComponent<{
  results: HighlightedSearchResults;
  children: (filterNode: FilterNode) => React.ReactNode;
  searchText?: string;
}> = ({ children, results, searchText }) => {
  /*
    filter drawings here as well
  */
  const filterNode = useMemo(() => {
    const obj = results.reduce((prev, { title }) => {
      prev[title] = true;
      return prev;
    }, {} as { [k: string]: true });
    return (node: GraphNode) => {
      return node.type === "drawing" && searchText
        ? Boolean(node.label?.includes(searchText))
        : Boolean(obj[node.id]);
    };
  }, [results, searchText]);
  return <>{children(filterNode)}</>;
};

const SearchableAppGraph = () => {
  return (
    <Box sx={{ ml: "15px", mr: 1 }}>
      <div style={{ paddingTop: "1em" }}>
        <Search
          render={(results, innerText) => {
            return (
              <ProvideFilterNode results={results} searchText={innerText}>
                {(filterNode) => (
                  <AppGraph filterNode={innerText ? filterNode : undefined} />
                )}
              </ProvideFilterNode>
            );
          }}
        />
      </div>
    </Box>
  );
};

export default SearchableAppGraph;
