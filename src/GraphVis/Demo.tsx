import Graph from "react-vis-graph-wrapper";
import React, { useMemo } from "react";
import { Box, Theme, useTheme } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../store/createRootReducer";
import { createSelector } from "reselect";
import Search, { HighlightedSearchResults } from "../Search/components/Search";

const getOptions = (theme: Theme) => {
  const contrastTextColor = theme.palette.getContrastText(theme.palette.background.default);
  const nodeColor = theme.palette.background.paper;
  return {
    layout: {
      hierarchical: false
    },
    nodes: {
      shape: 'dot',
      color: {
        background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.2)', // nodeColor,
        border: 'transparent',
        highlight: {
          border: 'transparent',
          background: theme.palette.action.selected
        }
      },
      font: {
        face: theme.typography.fontFamily,
        color: theme.palette.getContrastText(nodeColor)
      }
    },
    edges: {
      color: contrastTextColor
    }
  }
};

type NodeType = 'drawing' | 'document';

type GraphNode = {
  id: string;
  label: string;
  type?: NodeType | undefined;
  color?: any;
};
type GraphDescription = {
  nodes: GraphNode[];
  edges: {
    from: string;
    to: string;
    toType?: NodeType | undefined;
  }[];
}
const createGraphSelector = () => createSelector(
  (state: RootState) => state.documents,
  (state: RootState) => state.drawings,
  (documents, drawings): GraphDescription => {
    const nodes: GraphNode[] = [];
    const edges: { from: string; to: string; toType?: NodeType }[] = []
    Object.values(documents).forEach(doc => {
      nodes.push({
        id: doc.name,
        label: doc.name,
        type: 'document'
      });
      doc.references.forEach(ref => {
        edges.push({
          from: doc.name,
          to: ref,
          toType: 'document'
        })
      })
    })
    Object.values(drawings).forEach(drawing => {
      nodes.push({
        id: 'drawing:' + drawing.name,
        label: drawing.name,
        type: 'drawing',
        color: {
          border: 'grey',
          background: 'transparent'
        }
        // can have drawings be a different color here.
      });
      drawing.backReferences.forEach(br => {
        edges.push({
          from: br,
          to: 'drawing:' + drawing.name,
          toType: 'drawing'
        })
      })
    });
    return {
      nodes,
      edges
    }
  }
)
type FilterNode = (node: GraphNode) => boolean;
interface AppGraphProps {
  filterNode?: FilterNode;
  colorNode?: (node: GraphNode) => string | undefined;
}
const AppGraph = ({ filterNode }: AppGraphProps) => {
  const theme = useTheme()
  const edgesSelector = useMemo(() => createGraphSelector(), []);
  const { nodes, edges } = useSelector(edgesSelector)

  const { graph, events } = useMemo(() => {
    return {
      graph: {
        nodes,
        edges
      },
      events: {
        select: ({ nodes, edges }: { nodes: unknown, edges: unknown }) => {
          console.log("Selected nodes:");
          console.log(nodes);
          console.log("Selected edges:");
          console.log(edges);
        },
      }
    }
  }, [nodes, edges])

  let filteredGraph = useMemo(() => {
    const { nodes, edges } = graph;
    if (filterNode) {
      let newNodes = nodes.filter(node => filterNode(node))
      let newNodesObj = newNodes.reduce((prev, curr) => {
        prev[curr.id] = true;
        return prev;
      }, {} as { [k: string]: true })
      let newEdges = edges.filter(edge => newNodesObj[edge.from] && newNodesObj[edge.to]);
      return { nodes: newNodes, edges: newEdges };
    }
    return graph;
  }, [graph, filterNode])
  /*
    TODO
    debounce listener to window resize, and remount when finished.
  */
  return (
    <Graph graph={filteredGraph} options={getOptions(theme)} events={events} style={{ height: "640px" }} />
  );

}
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
    }, {} as { [k: string]: true })
    return (node: GraphNode) => {
      return node.type === 'drawing' && searchText ? Boolean(node.label?.includes(searchText)) : Boolean(obj[node.label])
    }
  }, [results, searchText])
  return <>
    {children(filterNode)}
  </>
}

const SearchableAppGraph = () => {
  return <Box sx={{ ml: '15px', mr: 1 }}>
    <div style={{ marginTop: '1em' }}>
      <Search
        render={(results, innerText) => {
          return <ProvideFilterNode results={results} searchText={innerText}>
            {filterNode => (
              <AppGraph
                filterNode={innerText ? filterNode : undefined}
              />
            )}</ProvideFilterNode>
        }}
      />
    </div>
  </Box>
}

export default SearchableAppGraph;