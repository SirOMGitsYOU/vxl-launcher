import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { useWindowFocus } from "../../hooks/useWindowFocus";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  forceAnimate?: boolean;
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-32 h-32",
};

interface Vertex {
  x: number;
  y: number;
  z: number;
}

export function Logo({ size = "md", className, onClick, forceAnimate = false }: LogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const isWindowFocused = useWindowFocus();
  const animationFrameIdRef = useRef<number>();
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const shouldAnimate = forceAnimate || (isWindowFocused && isBackgroundAnimationEnabled);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Reset rotation when animations are disabled
    if (!shouldAnimate) {
      rotationRef.current = { x: 0, y: 0, z: 0 };
    }

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 255, g: 255, b: 255 };
    };

    // Use white instead of accent color
    const rgb = { r: 255, g: 255, b: 255 };

    const resize = () => {
      // Clear any pending resize timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Debounce resize to prevent performance issues
      resizeTimeoutRef.current = setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        // Redraw immediately after resize
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawVoxel(shouldAnimate);
      }, 100); // 100ms debounce
    };

    const drawVoxel = (animate: boolean = false) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2;
      const voxelSize = Math.min(width, height) * 0.5;

      const halfSize = voxelSize / 2;

      // Cube vertices
      const vertices: Vertex[] = [
        { x: -halfSize, y: -halfSize, z: halfSize },
        { x: halfSize, y: -halfSize, z: halfSize },
        { x: halfSize, y: halfSize, z: halfSize },
        { x: -halfSize, y: halfSize, z: halfSize },
        { x: -halfSize, y: -halfSize, z: -halfSize },
        { x: halfSize, y: -halfSize, z: -halfSize },
        { x: halfSize, y: halfSize, z: -halfSize },
        { x: -halfSize, y: halfSize, z: -halfSize },
      ];

      // Apply animation if enabled
      if (animate) {
        rotationRef.current.x += 0.01;
        rotationRef.current.y += 0.015;
        rotationRef.current.z += 0.008;
      }

      // Base isometric angle: 35.264° around X, 45° around Y
      const baseRotX = Math.atan(Math.sqrt(2)); // ~35.264°
      const baseRotY = Math.PI / 4; // 45°

      const rotX = baseRotX + rotationRef.current.x;
      const rotY = baseRotY + rotationRef.current.y;
      const rotZ = rotationRef.current.z;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ);
      const sinZ = Math.sin(rotZ);

      const rotatedVertices = vertices.map((v) => {
        let x = v.x;
        let y = v.y;
        let z = v.z;

        // Rotate around X
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;

        // Rotate around Y
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;

        // Rotate around Z
        const x3 = x2 * cosZ - y1 * sinZ;
        const y3 = x2 * sinZ + y1 * cosZ;

        const scale = 500 / (500 + z2);
        return {
          x: centerX + x3 * scale,
          y: centerY + y3 * scale,
          z: z2,
        };
      });

      // Face definitions
      const faces = [
        [0, 1, 2, 3], // front
        [5, 4, 7, 6], // back
        [4, 0, 3, 7], // left
        [1, 5, 6, 2], // right
        [4, 5, 1, 0], // bottom
        [3, 2, 6, 7], // top
      ];

      // Calculate face depths for sorting
      const faceDepths = faces.map((face) => {
        const avgZ =
          face.reduce((sum, i) => sum + rotatedVertices[i].z, 0) / face.length;
        return { face, avgZ };
      });

      faceDepths.sort((a, b) => a.avgZ - b.avgZ);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw faces
      faceDepths.forEach(({ face }) => {
        const avgZ =
          face.reduce((sum, i) => sum + rotatedVertices[i].z, 0) / face.length;
        const depthFactor = Math.min(1, Math.max(0.3, (avgZ + 250) / 500));

        ctx.beginPath();
        ctx.moveTo(rotatedVertices[face[0]].x, rotatedVertices[face[0]].y);
        for (let i = 1; i < face.length; i++) {
          ctx.lineTo(rotatedVertices[face[i]].x, rotatedVertices[face[i]].y);
        }
        ctx.closePath();

        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 * depthFactor})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    };

    const animate = () => {
      // Clear the entire canvas with device pixel ratio considered
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      drawVoxel(shouldAnimate);
      
      if (shouldAnimate) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener("resize", resize);
    resize();
    
    // Draw initial frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawVoxel(false);

    // Start animation loop if animations are enabled
    if (shouldAnimate) {
      animationFrameIdRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [accentColor.value, shouldAnimate, forceAnimate]);

  return (
    <div
      className={cn(
        "relative",
        sizeClasses[size],
        className,
        onClick && "cursor-pointer hover:scale-110 transition-transform duration-200"
      )}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}
