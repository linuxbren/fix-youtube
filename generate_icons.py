#!/usr/bin/env python3
"""Generate Fix YouTube icons from the outer rim of the Omarchy logo.

The official Omarchy mark (https://omarchy.org/brand/omarchy-logo.svg) is a
1200x1200, 80-unit grid. This icon keeps only the outer 80-unit rim, including
the official 80-unit gap in the bottom edge at x=640..720, recolored to
YouTube red (#FF0000). A white play triangle with a black mitered outline is
centered (by centroid) in the opening so the arrow stays visible on light
backgrounds. Transparent background. Inner channels, hooks, and the inner
window frame are omitted.

16px is drawn on the pixel grid so the 1px rim, triangle, and 1px black
outline stay crisp. Larger sizes are supersampled from the vector geometry
and downscaled.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent / "icons"

# Official Omarchy geometry (viewBox 0 0 1200 1200, 80-unit cells)
VIEW = 1200.0
RIM = 80.0
GAP_X0, GAP_X1 = 640.0, 720.0
RED = (255, 0, 0, 255)  # #FF0000
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)

# Play triangle sized to sit clearly in the opening, centroid at (600, 600)
TRI_W, TRI_H = 480.0, 560.0
TRI_L = (1800.0 - TRI_W) / 3.0  # 440
TRI_R = TRI_L + TRI_W           # 920
TRI_T = 600.0 - TRI_H / 2.0     # 320
TRI_B = 600.0 + TRI_H / 2.0     # 880
TRI = ((TRI_L, TRI_T), (TRI_R, 600.0), (TRI_L, TRI_B))

# Outside black stroke in viewBox units. 48 units = 2px at 48, ~5px at 128,
# ~20px at 512 — readable at every generated size without swallowing the fill.
STROKE = 48.0

SVG = f"""\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
  <!-- Outer rim of the Omarchy logo (official mark is 80-unit grid, 1200 viewBox,
       bottom gap at x=640-720). Recolored #FF0000. Inner details omitted. -->
  <path fill="#FF0000" fill-rule="evenodd" clip-rule="evenodd"
        d="M0 0h1200v1200H0zM80 80h1040v1040H80zM640 1120h80v80H640z"/>
  <!-- White play triangle. Stroke is 96 (centered) so 48 units fall outside;
       paint-order keeps the fill size and leaves a mitered black outline. -->
  <polygon fill="#FFFFFF" stroke="#000000" stroke-width="{STROKE * 2:g}"
           stroke-linejoin="miter" stroke-miterlimit="4" paint-order="stroke fill"
           points="{TRI_L:g},{TRI_T:g} {TRI_R:g},600 {TRI_L:g},{TRI_B:g}"/>
</svg>
"""


def _in_rim(vx: np.ndarray, vy: np.ndarray) -> np.ndarray:
    in_canvas = (vx >= 0) & (vx < VIEW) & (vy >= 0) & (vy < VIEW)
    in_inner = (vx >= RIM) & (vx < VIEW - RIM) & (vy >= RIM) & (vy < VIEW - RIM)
    in_gap = (vx >= GAP_X0) & (vx < GAP_X1) & (vy >= VIEW - RIM) & (vy < VIEW)
    return in_canvas & ~in_inner & ~in_gap


def _in_triangle(vx: np.ndarray, vy: np.ndarray, verts: tuple = TRI) -> np.ndarray:
    (x1, y1), (x2, y2), (x3, y3) = verts
    den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
    a = ((y2 - y3) * (vx - x3) + (x3 - x2) * (vy - y3)) / den
    b = ((y3 - y1) * (vx - x3) + (x1 - x3) * (vy - y3)) / den
    c = 1.0 - a - b
    eps = 1e-9
    return (a >= -eps) & (b >= -eps) & (c >= -eps)


def _winding_positive(verts: tuple) -> bool:
    area = 0.0
    for i, (x1, y1) in enumerate(verts):
        x2, y2 = verts[(i + 1) % len(verts)]
        area += x1 * y2 - x2 * y1
    return area > 0


def _offset_polygon_miter(verts: tuple, distance: float) -> tuple:
    """Outward offset of a triangle with miter joins."""
    n = len(verts)
    ccw = _winding_positive(verts)
    out = []
    for i in range(n):
        prev = verts[(i - 1) % n]
        curr = verts[i]
        nxt = verts[(i + 1) % n]

        def outward(p, q):
            dx, dy = q[0] - p[0], q[1] - p[1]
            length = math.hypot(dx, dy)
            # Left normal; outward is the opposite when the path is CCW.
            lx, ly = -dy / length, dx / length
            return (-lx, -ly) if ccw else (lx, ly)

        n1 = outward(prev, curr)
        n2 = outward(curr, nxt)
        denom = 1.0 + n1[0] * n2[0] + n1[1] * n2[1]
        if abs(denom) < 1e-8:
            mx = curr[0] + distance * n2[0]
            my = curr[1] + distance * n2[1]
        else:
            mx = curr[0] + distance * (n1[0] + n2[0]) / denom
            my = curr[1] + distance * (n1[1] + n2[1]) / denom
        out.append((mx, my))
    return tuple(out)


def render_vector(size: int, supersample: int = 8) -> Image.Image:
    s = size * supersample
    scale = s / VIEW
    ys, xs = np.ogrid[0:s, 0:s]
    vx = (xs + 0.5) / scale
    vy = (ys + 0.5) / scale
    arr = np.zeros((s, s, 4), dtype=np.uint8)
    arr[_in_rim(vx, vy)] = RED
    expanded = _offset_polygon_miter(TRI, STROKE)
    arr[_in_triangle(vx, vy, expanded)] = BLACK
    arr[_in_triangle(vx, vy)] = WHITE
    img = Image.fromarray(arr, "RGBA")
    if supersample == 1:
        return img
    return img.resize((size, size), Image.Resampling.LANCZOS)


def render_16() -> Image.Image:
    """Crisp 16px: 1px red rim, white play triangle, 1px black outline."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    for i in range(16):
        px[i, 0] = RED
        px[0, i] = RED
        px[15, i] = RED
        px[i, 15] = RED
    px[8, 15] = (0, 0, 0, 0)  # bottom-edge gap, just right of center

    white = set()
    for y, xs in (
        (4, range(6, 7)),
        (5, range(6, 8)),
        (6, range(6, 9)),
        (7, range(6, 11)),
        (8, range(6, 11)),
        (9, range(6, 9)),
        (10, range(6, 8)),
        (11, range(6, 7)),
    ):
        for x in xs:
            white.add((x, y))

    # 8-connected outside outline, kept off the red rim
    black = set()
    for x, y in white:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if (nx, ny) in white:
                    continue
                if nx <= 0 or nx >= 15 or ny <= 0 or ny >= 15:
                    continue
                black.add((nx, ny))
    for x, y in black:
        px[x, y] = BLACK
    for x, y in white:
        px[x, y] = WHITE
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon.svg").write_text(SVG, encoding="utf-8")
    print(f"wrote {OUT / 'icon.svg'}")

    render_16().save(OUT / "icon16.png")
    print(f"wrote {OUT / 'icon16.png'}")

    for size, ss in ((48, 8), (128, 8), (512, 4)):
        path = OUT / f"icon{size}.png"
        render_vector(size, supersample=ss).save(path)
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
