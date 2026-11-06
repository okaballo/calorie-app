import { useEffect, useId, useRef } from "react";
import "./OKB-LiquidGlass.css";

// Displacement map: R/G encode x/y offsets (128 = no shift), strongest at the rim.
function buildLensMap(w = 256, h = 128) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * 2 - 1;
      const ny = (y / h) * 2 - 1;
      // Lower exponents push the duplicated edge pixels further toward the center.
      const edge = Math.min(1, Math.abs(nx) ** 5 + Math.abs(ny) ** 3);
      const i = (y * w + x) * 4;
      img.data[i] = 128;
      img.data[i + 1] = 128 - ny * edge * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

// shortcut: one instance per page (the SVG filter id and map size are shared), upgrade by
// giving each instance its own filter id if you need several differently-sized glasses.
export default function LiquidGlass({ children, className = "", style }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  // Own filter id per instance (TabBar uses two: the bar and the lens).
  const fid = "lens-" + useId().replace(/:/g, "");

  useEffect(() => {
    mapRef.current.setAttribute("href", buildLensMap());
    // "100%" on feImage doesn't track the element (the svg is 0x0), so size the map in pixels.
    const ro = new ResizeObserver(() => {
      mapRef.current.setAttribute("width", boxRef.current.offsetWidth);
      mapRef.current.setAttribute("height", boxRef.current.offsetHeight);
    });
    ro.observe(boxRef.current);

    return () => ro.disconnect();
  }, []);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter
          id={fid}
          colorInterpolationFilters="sRGB"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <feImage
            ref={mapRef}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="56"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div ref={boxRef} className={"liquid-glass " + className} style={{ "--lg-filter": `url(#${fid})`, ...style }}>
        <div className="liquid-glass__bg"></div>
        {children}
      </div>
    </>
  );
}
