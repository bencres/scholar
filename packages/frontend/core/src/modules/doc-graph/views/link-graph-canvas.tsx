import { cssVarV2 } from '@toeverything/theme/v2';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from 'react-force-graph-2d';

import type { DocLinkGraphSnapshot } from '../types';
import * as styles from './styles.css';

type GraphNode = NodeObject & {
  id: string;
  title: string;
  degree: number;
};

type GraphLink = LinkObject & {
  weight: number;
};

export const LinkGraphCanvas = ({
  snapshot,
  onNodeClick,
  emptyLabel = 'No linked pages to display.',
}: {
  snapshot: DocLinkGraphSnapshot;
  onNodeClick: (docId: string) => void;
  emptyLabel?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined
  );
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    });
    observer.observe(element);
    setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = snapshot.nodes.map(node => ({
      id: node.id,
      title: node.title,
      degree: node.degree,
    }));
    const links: GraphLink[] = snapshot.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    }));
    return { nodes, links };
  }, [snapshot]);

  const neighborIds = useMemo(() => {
    if (!hoverNodeId) return null;
    const ids = new Set<string>([hoverNodeId]);
    for (const link of graphData.links) {
      const sourceId =
        typeof link.source === 'string' ? link.source : link.source.id;
      const targetId =
        typeof link.target === 'string' ? link.target : link.target.id;
      if (sourceId === hoverNodeId) ids.add(targetId);
      if (targetId === hoverNodeId) ids.add(sourceId);
    }
    return ids;
  }, [graphData.links, hoverNodeId]);

  const nodeColor = useCallback(
    (node: GraphNode) => {
      if (!neighborIds) {
        return cssVarV2.button.primary;
      }
      const nodeId = node.id;
      if (!nodeId) return cssVarV2.layer.insideBorder.blackBorder;
      return neighborIds.has(nodeId)
        ? cssVarV2.button.primary
        : cssVarV2.layer.insideBorder.blackBorder;
    },
    [neighborIds]
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      if (!neighborIds) {
        return cssVarV2.layer.insideBorder.border;
      }
      const sourceId =
        typeof link.source === 'string' ? link.source : link.source.id;
      const targetId =
        typeof link.target === 'string' ? link.target : link.target.id;
      if (!sourceId || !targetId) {
        return cssVarV2.layer.insideBorder.border;
      }
      return neighborIds.has(sourceId) && neighborIds.has(targetId)
        ? cssVarV2.text.secondary
        : cssVarV2.layer.insideBorder.border;
    },
    [neighborIds]
  );

  if (!graphData.nodes.length) {
    return (
      <div ref={containerRef} className={styles.graphContainer}>
        <div className={styles.emptyState}>{emptyLabel}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.graphContainer}>
      <ForceGraph2D
        ref={graphRef}
        width={size.width}
        height={size.height}
        graphData={graphData}
        nodeId="id"
        nodeLabel="title"
        nodeVal={node => 2 + Math.sqrt((node as GraphNode).degree)}
        nodeColor={node => nodeColor(node as GraphNode)}
        linkColor={link => linkColor(link as GraphLink)}
        linkWidth={link => Math.min(4, 0.5 + (link as GraphLink).weight)}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        onNodeClick={node => onNodeClick((node as GraphNode).id)}
        onNodeHover={node =>
          setHoverNodeId(node ? (node as GraphNode).id : null)
        }
        cooldownTicks={80}
      />
    </div>
  );
};
