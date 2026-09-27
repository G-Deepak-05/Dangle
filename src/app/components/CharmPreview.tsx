import { useEffect, useRef, type ReactNode } from "react";
import { CharmStage, type StageConfig } from "../../engine/stage";

interface Props {
  config: StageConfig;
  height: number;
  label: string;
  onDragChange?: (dragging: boolean) => void;
  onThreadLengthCommit?: (threadLength: number) => void;
  /** Bump to give the charm a small push, e.g. after a setting changes. */
  nudgeKey?: unknown;
  children?: ReactNode;
}

/**
 * A live, grabbable charm hanging from the top edge of a panel. The simulation lives
 * in a CharmStage outside React; props are pushed into it without re-rendering.
 */
export function CharmPreview({ config, height, label, onDragChange, onThreadLengthCommit, nudgeKey, children }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<CharmStage | null>(null);
  const callbacks = useRef({ onDragChange, onThreadLengthCommit });
  callbacks.current = { onDragChange, onThreadLengthCommit };

  useEffect(() => {
    const stage = new CharmStage(canvasRef.current!, {
      selfHover: true,
      breeze: true,
      onDragChange: (d) => callbacks.current.onDragChange?.(d),
      onThreadLengthCommit: (t) => callbacks.current.onThreadLengthCommit?.(t),
    });
    stageRef.current = stage;
    const host = hostRef.current!;
    const layout = () => {
      const width = host.clientWidth;
      stage.setViewport(width, height, width / 2, 0);
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(host);
    return () => {
      observer.disconnect();
      stage.destroy();
      stageRef.current = null;
    };
  }, [height]);

  const { charm, size, rope, threadColor, beads, threadLength, physics, reduceMotion, scale } = config;
  useEffect(() => {
    void stageRef.current?.configure({ charm, size, rope, threadColor, beads, threadLength, physics, reduceMotion, scale });
  }, [charm, size, rope, threadColor, beads, threadLength, physics, reduceMotion, scale, height]);

  useEffect(() => {
    if (nudgeKey !== undefined && !reduceMotion) stageRef.current?.nudge(120);
  }, [nudgeKey, reduceMotion]);

  return (
    <div className="stage" ref={hostRef} style={{ height }}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
      {children}
    </div>
  );
}
