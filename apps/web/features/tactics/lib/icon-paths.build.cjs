/**
 * Turn one lucide icon node into SVG path data.
 *
 * Konva draws paths, not SVG primitives, so a circle or a line has to become a `d` string. The
 * twenty token icons use only `path`, `line` and `circle`; anything else is refused loudly rather
 * than dropped, which would silently draw half an icon.
 *
 * Shared by the generator script and the test that checks the committed data for drift, so both
 * sides convert identically.
 * @param {[string, Record<string, string | number>]} node - A lucide icon node: tag plus attributes
 * @returns {string} The node as SVG path data
 */
function nodeToPath([tag, attrs]) {
  switch (tag) {
    case "path":
      return String(attrs.d);
    case "line":
      return `M${attrs.x1} ${attrs.y1}L${attrs.x2} ${attrs.y2}`;
    case "circle": {
      const cx = Number(attrs.cx);
      const cy = Number(attrs.cy);
      const r = Number(attrs.r);

      return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
    }
    default:
      throw new Error(`Unsupported lucide node: ${tag}`);
  }
}

/**
 * The path data of one icon, in draw order.
 * @param {Array<[string, Record<string, string | number>]>} icon - The icon's nodes
 * @returns {string[]} One `d` string per node
 */
function iconToPaths(icon) {
  return icon.map(nodeToPath);
}

module.exports = { iconToPaths, nodeToPath };
