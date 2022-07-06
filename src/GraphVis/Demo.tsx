import Graph from "react-graph-vis";
import React, { useMemo } from "react";
import { Box, Theme, useTheme } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../store/createRootReducer";
import { createSelector } from "reselect";
import Search from "../Search/components/Search";

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
const createGraphSelector = () => createSelector(
  (state: RootState) => state.documents,
  (state: RootState) => state.drawings,
  (documents, drawings) => {
    const nodes: {
      id: string,
      label: string,
      type?: NodeType,
      color?: any;
    }[] = [];
    const edges: { from: string; to: string; toType?: NodeType  }[] = []
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
const AppGraph = () => {
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
          select: ({ nodes, edges }: { nodes: unknown, edges: unknown}) => {
            console.log("Selected nodes:");
            console.log(nodes);
            console.log("Selected edges:");
            console.log(edges);
          },
        }
      }
    }, [nodes, edges])

  /*
    TODO
    debounce listener to window resize, and remount when finished.
  */
  return (
    <div>
      <Box sx={{ ml: 2, mr: 1 }}>
        <div style={{ marginTop: '1em' }}>
          <Search />       
        </div>
      </Box>
      <Graph graph={graph} options={getOptions(theme)} events={events} style={{ height: "640px" }} />
    </div>
  );

}

export default AppGraph;