import React, { useEffect, useMemo, useState } from "react";
import ForceGraph3D, {
  NodeObject,
  LinkObject,
  ForceGraphMethods,
} from "react-force-graph-3d";
import { Box, useTheme } from "@mui/material";
import { createSelector } from "reselect";
import { useAppSelector } from "../store/hooks";
import { RootState } from "../store/configureStore";
import * as THREE from "three";
import { SizeMe } from "react-sizeme";
import { useStore } from "react-redux";
import { drawingSvgStore } from "../Excalidraw/svgFromDrawing";
import Search, { HighlightedSearchResults } from "../Search/components/Search";

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

const createGraphSelector = () =>
  createSelector(
    (state: RootState) => state.documents,
    (state: RootState) => state.drawings,
    (state: RootState) => state.categories,
    (documents, drawings, categories) => {
      const nodes: NodeObject[] = [];
      const links: LinkObject[] = [];

      Object.values(documents).forEach((doc) => {
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
          return {
            ...n,
            svgImage: r,
          };
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
  return (
    <div
      style={{
        height: "calc(100% - 1em)",
        width: "100%",
      }}
    >
      <SizeMe>
        {({ size }) => (
          <ForceGraph3D
            ref={graphRef}
            height={size.height ?? undefined}
            width={size.width ?? undefined}
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
        )}
      </SizeMe>
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
        },
      }}
      SearchElementProps={{
        style: {
          position: "absolute",
          top: "1em",
          left: "1em",
          zIndex: 100,
        },
      }}
      render={(results, innerText) => {
        return (
          <ProvideFilterNode results={results} searchText={innerText}>
            {(filterNode) => (
              <div>
                <AppGraph3D filterNode={innerText ? filterNode : undefined} />
              </div>
            )}
          </ProvideFilterNode>
        );
      }}
    />
  );
};

export default SearchableAppGraph3D;
