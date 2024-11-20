import React, { useEffect, useMemo, useState } from "react";
import ForceGraph3D, {
  NodeObject,
  LinkObject,
  ForceGraphMethods,
} from "react-force-graph-3d";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { createSelector } from "reselect";
import { useAppSelector } from "../store/hooks";
import { RootState } from "../store/configureStore";
import * as THREE from "three";
import { SizeMe } from "react-sizeme";
import { useStore } from "react-redux";
import { drawingSvgStore } from "../Excalidraw/svgFromDrawing";
import Search, { HighlightedSearchResults } from "../Search/components/Search";
import { Close, SyncDisabled, ThreeSixty } from "@mui/icons-material";
import Page from "../SlateGraph/Page";
import ResizableDrawer from "./ResizableDrawer";
import { isEqual, result } from "lodash";
import { createGraphSelector } from "./graphSelector";

type DiffResult = {
  path: string;
  type: "added" | "removed" | "changed";
  value: any;
  oldValue?: any;
};

const deepDiff = (obj1: any, obj2: any, path = ""): DiffResult[] => {
  const diffs: DiffResult[] = [];

  const isObject = (value: any) =>
    value && typeof value === "object" && !Array.isArray(value);

  // Get all keys from both objects
  const keys = new Set([
    ...Object.keys(obj1 || {}),
    ...Object.keys(obj2 || {}),
  ]);

  keys.forEach((key) => {
    const fullPath = path ? `${path}.${key}` : key;

    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    if (isObject(val1) && isObject(val2)) {
      // Recurse into nested objects
      diffs.push(...deepDiff(val1, val2, fullPath));
    } else if (Array.isArray(val1) && Array.isArray(val2)) {
      // Handle array differences
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diffs.push({
          path: fullPath,
          type: "changed",
          value: val2,
          oldValue: val1,
        });
      }
    } else if (val1 !== val2) {
      if (val1 === undefined) {
        diffs.push({ path: fullPath, type: "added", value: val2 });
      } else if (val2 === undefined) {
        diffs.push({ path: fullPath, type: "removed", value: val1 });
      } else {
        diffs.push({
          path: fullPath,
          type: "changed",
          value: val2,
          oldValue: val1,
        });
      }
    }
  });

  return diffs;
};

const logDeepDiff = (obj1: any, obj2: any) => {
  const diffs = deepDiff(obj1, obj2);

  diffs.forEach((diff) => {
    const { path, type, value, oldValue } = diff;
    if (type === "added") {
      console.log(`Added at ${path}:`, value);
    } else if (type === "removed") {
      console.log(`Removed at ${path}:`, value);
    } else if (type === "changed") {
      console.log(`Changed at ${path}:`, `from`, oldValue, `to`, value);
    }
  });

  if (diffs.length === 0) {
    console.log("No differences found.");
  }
};

function getSvgDimensionsFromBase64(
  base64Svg: string
): { width: number; height: number } | null {
  try {
    // Decode the base64 string
    const svgString = atob(base64Svg.split(",")[1]); // Remove the data URL prefix

    // Parse the SVG string
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.documentElement;

    // Extract width and height attributes
    const widthAttr = svgElement.getAttribute("width");
    const heightAttr = svgElement.getAttribute("height");

    if (!widthAttr || !heightAttr) {
      console.warn("Width or height attribute missing in the SVG.");
      return null;
    }

    const width = parseFloat(widthAttr);
    const height = parseFloat(heightAttr);

    return { width, height };
  } catch (error) {
    console.error("Failed to parse SVG dimensions:", error);
    return null;
  }
}

function scaleToFit(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { scaledWidth: number; scaledHeight: number } {
  const aspectRatio = (width * 1.0) / (height * 1.0);

  // Scale width and height to fit within the constraints
  if (width > maxWidth || height > maxHeight) {
    if (width / maxWidth > height / maxHeight) {
      // Width is the limiting factor
      const scaledWidth = maxWidth;
      const scaledHeight = maxWidth / aspectRatio;
      return { scaledWidth, scaledHeight };
    } else {
      // Height is the limiting factor
      const scaledHeight = maxHeight;
      const scaledWidth = maxHeight * aspectRatio;
      return { scaledWidth, scaledHeight };
    }
  }

  // No scaling needed if within bounds
  return { scaledWidth: width, scaledHeight: height };
}

const createGraphSelectorOrig = () =>
  createSelector(
    (state: RootState) => state.documents,
    (state: RootState) => state.drawings,
    (state: RootState) => state.categories,
    (documents, drawings, categories) => {
      const nodes: NodeObject[] = [];
      const links: LinkObject[] = [];

      Object.values(documents).forEach((doc) => {
        // doc.documentHash
        // doc.backReferencesHash
        // doc.backReferencesHash

        const color =
          (doc.categoryId && categories[doc.categoryId]?.color) ?? undefined;
        nodes.push({
          id: doc.name,
          label: doc?.displayName ?? doc?.name,
          type: "document",
          color,
        });
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
        nodes.push({
          id: "drawing:" + drawing.name,
          label: drawing?.displayName ?? drawing?.name,
          type: "drawing",
        });
        drawing.backReferences.forEach((br) => {
          links.push({ source: br, target: "drawing:" + drawing.name });
        });
      });

      return { nodes, links };
    }
  );

const AppGraph3D = ({ filterNode }: { filterNode?: FilterNode }) => {
  const theme = useTheme();
  const graphSelector = useMemo(() => createGraphSelector(), []);
  const { nodes: rawNodes, links } = useAppSelector(graphSelector);
  useMemo(() => {
    console.log({ rawNodes });
  }, [rawNodes]);
  useMemo(() => {
    console.log({ links });
  }, [links]);
  const [nodes, setNodes] = useState<NodeObject[]>(rawNodes);
  const store = useStore<RootState>();
  const isDark = theme.palette.mode === "dark";
  useEffect(() => {
    const whenDone = (results: (string | null)[]) => {
      setNodes(
        rawNodes.map((n, i) => {
          const r = results[i];
          if (!r) {
            return n;
          }
          n.svgImage = r;
          return n;
        })
      );
    };
    // -1 means unresolved
    // null means we don't need any data for this node index.
    // string is the generated svg base64 string

    // when an svg is generated, we check if we are done (no -1s) and if so, call 'whenDone' with the ready results
    let results: (string | null | -1)[] = rawNodes.map((n) => -1);
    const cancels: (() => void)[] = [];
    rawNodes.forEach((n, i) => {
      if (n.type === "drawing") {
        const id = (n.id as string).slice("drawing:".length);
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
    if (results.every((r) => r !== -1)) {
      setNodes((_nodes) => {
        if (_nodes.length === rawNodes.length) {
          return _nodes;
        }
        return rawNodes;
      });
    }
    return () => {
      cancels.forEach((cancel) => {
        cancel();
      });
    };
  }, [rawNodes, store, isDark]);

  const filteredGraph = useMemo(() => {
    if (filterNode) {
      let newNodes = nodes.filter((node) => filterNode(node));
      let newNodesObj = newNodes.reduce((prev, curr) => {
        prev[curr.id!] = true;
        return prev;
      }, {} as { [k: string]: true });
      let newEdges = links.filter(
        (edge) =>
          newNodesObj[
            typeof edge.source === "object" && edge.source
              ? edge.source?.id!
              : edge.source + ""
          ] &&
          newNodesObj[
            typeof edge.target === "object" && edge.target
              ? edge.target?.id!
              : edge.target + ""
          ]
      );
      return { nodes: newNodes, links: newEdges };
    }
    return { nodes, links };
  }, [nodes, links, filterNode]);

  const graphRef = React.useRef<ForceGraphMethods>();

  useEffect(() => {
    console.log({ filteredGraph });
  }, [filteredGraph]);
  useEffect(() => {
    const to = setTimeout(() => {
      const graph = graphRef.current;
      if (graph) {
        // Reduce the default link distance
        graph.d3Force("link")!.distance(30); // Default is ~100

        // Reduce node repulsion
        graph.d3Force("charge")!.strength(-20); // Default is ~-50

        // Increase centering force to keep clusters together
        graph.d3Force("center")!.strength(1); // Default is 1
      }
    }, 100);
    return () => clearTimeout(to);
  }, []);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Detect mobile screen
  const isLg = useMediaQuery(theme.breakpoints.up("md")); // Detect mobile screen

  const [drawerOpen, setDrawerOpen] = useState(false); // Drawer state
  const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null); // Selected node

  const handleNodeClick = (node: NodeObject) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedNode(null);
  };

  const [readyToShowGraph, setReadyToShowGraph] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  useEffect(() => {
    // wait a bit after being mounted to start spinning, because graph takes some time to init.
    const to = setTimeout(() => setIsSpinning(true), 75);
    return () => clearTimeout(to);
  }, []);
  useEffect(() => {
    // show graph after spinning has begun, to prevent flash
    const to = setTimeout(() => setReadyToShowGraph(true), 250);
    return () => clearTimeout(to);
  }, []);
  const animationFrameRef = React.useRef<number | null>(null);

  // Toggle spinning
  const toggleSpin = () => {
    setIsSpinning((prev) => !prev);
  };

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoomToFit();

    let angle = 0; // Initialize the angle
    const radius = 500; // Adjust radius for your scene size
    const center = { x: 0, y: 0, z: 0 }; // Focus point

    const spin = () => {
      if (!graph) return;

      // Increment the angle for smooth rotation
      angle += 0.005; // Adjust for rotation speed
      const x = center.x + radius * Math.cos(angle);
      const z = center.z + radius * Math.sin(angle);

      // Smooth camera movement
      graph.cameraPosition({ x, y: 0, z }, center, 0);

      // Schedule the next frame
      animationFrameRef.current = requestAnimationFrame(spin);
    };

    if (isSpinning) {
      // Start the animation loop
      animationFrameRef.current = requestAnimationFrame(spin);
    }

    return () => {
      // Clean up the animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isSpinning]);

  const [drawerSize, setDrawerSize] = useState(isMobile ? 200 : 400);

  return (
    <div
      style={{
        visibility: readyToShowGraph ? undefined : "hidden",
        height: "calc(100% - 1em)",
        width: "100%",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "16px",
          left: "280px",
          zIndex: 100,
        }}
      >
        <IconButton
          color={isSpinning ? "secondary" : "primary"}
          aria-label="spin"
          onClick={toggleSpin}
        >
          {isSpinning ? <SyncDisabled /> : <ThreeSixty />}
        </IconButton>
      </Box>
      <div
        style={{
          marginTop: -1,
          marginBottom: -1,
          height: "100%",
        }}
      >
        <SizeMe noPlaceholder monitorHeight>
          {({ size }) => (
            <div style={{ height: "100%" }}>
              <ForceGraph3D
                onNodeClick={handleNodeClick}
                ref={graphRef}
                height={
                  typeof size.height === "number"
                    ? size.height - (drawerOpen && !isLg ? drawerSize : 0)
                    : undefined
                }
                width={
                  typeof size.width === "number"
                    ? size.width - (drawerOpen && isLg ? drawerSize : 0)
                    : undefined
                }
                graphData={filteredGraph}
                nodeLabel="label" // Display the 'label' property on hover
                nodeThreeObject={(node) => {
                  if (node.svgImage) {
                    const imgTexture = new THREE.TextureLoader().load(
                      node.svgImage
                    );
                    const spriteMaterial = new THREE.SpriteMaterial({
                      map: imgTexture,
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);

                    const dims = getSvgDimensionsFromBase64(node.svgImage);
                    const { scaledHeight, scaledWidth } =
                      dims?.width && dims?.height
                        ? scaleToFit(dims?.width, dims?.height, 50, 50)
                        : { scaledHeight: 50, scaledWidth: 50 };
                    sprite.scale.set(scaledWidth, scaledHeight, 1); // Adjust size as needed
                    return sprite;
                  }
                  // Default sphere for nodes
                  const sphereGeometry = new THREE.SphereGeometry(5);
                  const sphereMaterial = new THREE.MeshBasicMaterial({
                    color:
                      node.type === "drawing"
                        ? theme.palette.secondary.main
                        : node.color ?? theme.palette.primary.main,
                  });
                  return new THREE.Mesh(sphereGeometry, sphereMaterial);
                }}
                linkWidth={1}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.01}
                backgroundColor={theme.palette.background.default}
              />
            </div>
          )}
        </SizeMe>
      </div>
      <ResizableDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        isLg={isLg}
        isMobile={isMobile}
        drawerSize={drawerSize}
        setDrawerSize={setDrawerSize}
      >
        {selectedNode?.type === "document" ? (
          <Page
            docName={selectedNode.id as string}
            title={selectedNode.label}
          />
        ) : selectedNode?.type === "drawing" ? (
          <Typography>Show drawing details here...</Typography>
        ) : (
          <Typography>No details available.</Typography>
        )}
      </ResizableDrawer>
    </div>
  );
};
type FilterNode = (node: NodeObject) => boolean;

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
    return (node: NodeObject) => {
      return node.type === "drawing" && searchText
        ? Boolean(node.label?.includes(searchText))
        : Boolean(obj[node.id!]);
    };
  }, [results, searchText]);
  return <>{children(filterNode)}</>;
};

const SearchableAppGraph3D = () => {
  return (
    <Search
      RootElementProps={{
        style: {
          position: "relative",
          height: "100%",
        },
      }}
      SearchElementProps={{
        style: {
          position: "absolute",
          top: "1em",
          left: "2em",
          zIndex: 100,
        },
      }}
      render={(results, innerText) => {
        return (
          <ProvideFilterNode results={results} searchText={innerText}>
            {(filterNode) => (
              <AppGraph3D filterNode={innerText ? filterNode : undefined} />
            )}
          </ProvideFilterNode>
        );
      }}
    />
  );
};

export default SearchableAppGraph3D;
