(() => {
  try {
    figma.notify("Codex Exporter: 起動チェック中…", { timeout: 3000 });
    if (typeof __html__ === "undefined" || __html__ == null) {
      throw new Error(
        "__html__ is undefined. The UI bundle was not embedded. Run the build step to inline ui.html before packaging the plugin."
      );
    }
    figma.showUI(__html__, { width: 440, height: 560 });
    console.log("[Codex Exporter] UI bootstrapped");
  } catch (error) {
    console.error("[Codex Exporter] Failed to launch UI:", error);
    figma.notify("Codex Exporter: UI を起動できません。開発者コンソールを確認してください。");
    throw error;
  }
})();

let exportInProgress = false;

function mergeMetadata(base, additions) {
  const result = {};
  let key;
  if (base) {
    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        result[key] = base[key];
      }
    }
  }
  if (additions) {
    for (key in additions) {
      if (Object.prototype.hasOwnProperty.call(additions, key)) {
        result[key] = additions[key];
      }
    }
  }
  return result;
}

figma.ui.onmessage = (msg) => {
  const type = msg && typeof msg.type !== "undefined" ? msg.type : "";
  if (type === "CLOSE") {
    figma.closePlugin();
    return;
  }
  if (type === "READY" && !exportInProgress) {
    void runExport();
  }
};

async function runExport() {
  if (exportInProgress) {
    return;
  }
  exportInProgress = true;
  const frame = pickTargetFrame();
  if (!frame) {
    figma.notify("フレームを1つ選択してください。");
    figma.ui.postMessage({
      type: "EXPORT_ERROR",
      message: "フレームが選択されていません。",
    });
    exportInProgress = false;
    return;
  }
  try {
    const payload = await buildExport(frame);
    figma.ui.postMessage({
      type: "EXPORT_RESULT",
      payload,
    });
  } catch (error) {
    console.error("[export] unexpected failure:", error);
    const detail =
      error && typeof error.message === "string"
        ? "エクスポートに失敗しました。\n" + error.message
        : "エクスポートに失敗しました。";
    figma.notify("エクスポートに失敗しました。コンソールを確認してください。");
    figma.ui.postMessage({
      type: "EXPORT_ERROR",
      message: detail,
    });
  } finally {
    exportInProgress = false;
  }
}

function pickTargetFrame() {
  const selection = figma.currentPage.selection;
  if (selection.length === 1 && selection[0].type === "FRAME") {
    return selection[0];
  }
  const inSelection = selection.find((node) => node.type === "FRAME");
  if (inSelection) {
    return inSelection;
  }
  const firstFrame = figma.currentPage
    .findAll((node) => node.type === "FRAME")
    .at(0);
  return firstFrame || null;
}

async function buildExport(frame) {
  const frameBounds = getAbsoluteBounds(frame);
  const layoutName = slugify(frame.name) || `frame_${frame.id.slice(-6)}`;
  const meta = {
    layoutName,
    canvasWidth: Number(frameBounds.width),
    canvasHeight: Number(frameBounds.height),
    generatedAt: new Date().toISOString(),
    frameId: frame.id,
    pageName: frame.parent && frame.parent.type === "PAGE" ? frame.parent.name : undefined,
  };
  const originX = frameBounds.x;
  const originY = frameBounds.y;

  if (frame.backgrounds && frame.backgrounds.length > 0) {
    const background = frame.backgrounds.find(
      (paint) => paint && paint.type === "SOLID" && paint.visible !== false,
    );
    if (background && background.type === "SOLID") {
      meta.backgroundColor = rgbaToHex(
        background.color,
        typeof background.opacity !== "undefined" && background.opacity !== null ? background.opacity : 1,
      );
    }
  }

  const idFactory = createIdFactory();
  const assetIdFactory = createIdFactory("asset");
  const nodeList = flattenScene(frame);
  const nodeIdSet = new Set(nodeList.map((node) => node.id));
  const commentLookup = await collectComments(frame, nodeIdSet);
  meta.commentSummary = summarizeComments(commentLookup);

  const objects = [];
  const assetRequests = new Map();
  const cssPreviewTasks = [];

  nodeList.forEach((node, index) => {
    if (!node.visible) {
      return;
    }
    const geometry = node.absoluteBoundingBox;
    if (!geometry) {
      return;
    }
    const layoutObject = {
      id: idFactory(node.name, index),
      nodeId: node.id,
      type: mapNodeType(node),
      x: Number(geometry.x - originX),
      y: Number(geometry.y - originY),
      width: Number(geometry.width),
      height: Number(geometry.height),
    };
    if (node.name) {
      layoutObject.name = node.name;
    }

    const designNote = buildDesignNote(node, commentLookup);
    if (designNote) {
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        designNote,
      });
    }

    if ("rotation" in node && typeof node.rotation === "number" && node.rotation !== 0) {
      layoutObject.rotation = node.rotation;
    }
    if ("opacity" in node && typeof node.opacity === "number") {
      layoutObject.opacity = clampNumber(node.opacity, 0, 1);
    }

    const cssTemplate = isCssTemplateNode(node, designNote);
    if (cssTemplate) {
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        cssTemplate: true,
      });
    }

    const semanticRole = inferSemanticRole(node, designNote);
    if (semanticRole) {
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        semanticRole,
      });
    }

    const responsiveSpec = extractResponsiveSpec(node);
    if (responsiveSpec) {
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        responsiveSpec,
      });
    }

    const interactions = extractInteractions(node);
    if (interactions.length > 0) {
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        interactionMap: interactions,
      });
    }

    if (layoutObject.type === "shape") {
      const fill = extractFillColor(node);
      if (fill) {
        layoutObject.fill = fill;
      }
      const stroke = extractStroke(node);
      if (stroke) {
        layoutObject.stroke = stroke;
      }
    }

    if (layoutObject.type === "text" && node.type === "TEXT") {
      layoutObject.characters = node.characters;
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        textStyle: extractTextStyle(node),
        textColor: extractFillColor(node),
      });
      const contrast = computeContrastData(node);
      if (contrast) {
        layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
          a11y: {
            contrast,
            semanticRole: typeof semanticRole !== "undefined" ? semanticRole : undefined,
          },
        });
      }
    }

    const constraints = extractConstraints(node);
    if (constraints) {
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        constraints,
      });
    }

    if (
      node.type !== "TEXT" &&
      node.type !== "SLICE" &&
      node.type !== "GROUP"
    ) {
      const fill = extractFillColor(node);
      if (fill && !layoutObject.fill) {
        layoutObject.fill = fill;
      }
    }

    if (layoutObject.type === "image" && !cssTemplate) {
      const naming = deriveAssetNaming(node, frame);
      const strategy = determineAssetStrategy(node, designNote, naming);
      layoutObject.image = {
        id: naming.fullName,
        extension: strategy.extension,
        hash: undefined,
        availableFormats: strategy.availableFormats,
      };
      layoutObject.imageId = naming.fullName;
      layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
        section: naming.section,
        area: naming.area,
        assetName: naming.fullName,
        assetFormat: strategy.format,
        assetAutoFormatReason: strategy.reason,
        assetAvailableFormats: strategy.availableFormats,
      });
      if (!assetRequests.has(naming.fullName) && "exportAsync" in node) {
        assetRequests.set(naming.fullName, {
          id: assetIdFactory(naming.fullName, index),
          layoutId: naming.fullName,
          node,
          format: strategy.format,
          extension: strategy.extension,
          fileName: `${naming.fullName}.${strategy.extension}`,
          section: naming.section,
          area: naming.area,
          baseName: naming.baseName,
          availableFormats: strategy.availableFormats,
          autoFormatReason: strategy.reason,
        });
      }
    }

    if (cssTemplate) {
      const cssSnippet = buildCssSnippet(node);
      if (cssSnippet) {
        layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
          cssSnippet,
        });
      }
      cssPreviewTasks.push(
        attachCssPreview(layoutObject, node),
      );
    }

    objects.push(layoutObject);
  });

  const assets = await exportAssets(assetRequests);
  const preview = await exportFramePreview(frame, layoutName);
  await Promise.all(cssPreviewTasks);

  if (assets.length > 0) {
    const hashMap = new Map(assets.map((asset) => [asset.layoutId, asset.hash]));
    for (const obj of objects) {
      if (obj.imageId && hashMap.has(obj.imageId)) {
        obj.metadata = mergeMetadata(obj.metadata, {
          assetHash: hashMap.get(obj.imageId),
        });
        if (obj.image) {
          obj.image.hash = hashMap.get(obj.imageId);
        }
      }
    }
  }

  return {
    layout: {
      meta,
      objects,
    },
    assets,
    preview,
  };
}

function getAbsoluteBounds(node) {
  if (node.absoluteBoundingBox) {
    return node.absoluteBoundingBox;
  }
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
}

function flattenScene(root) {
  const result = [];
  const queue = root.children ? root.children.slice() : [];
  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);
    if ("children" in node && node.children) {
      for (let i = 0; i < node.children.length; i += 1) {
        queue.push(node.children[i]);
      }
    }
  }
  return result;
}

function mapNodeType(node) {
  switch (node.type) {
    case "TEXT":
      return "text";
    case "VECTOR":
    case "RECTANGLE":
    case "ELLIPSE":
    case "LINE":
    case "POLYGON":
    case "STAR":
    case "BOOLEAN_OPERATION":
      return hasImagePaint(node) ? "image" : "shape";
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
      return hasImagePaint(node) ? "image" : "group";
    case "FRAME":
      return hasImagePaint(node) ? "image" : "group";
    case "GROUP":
      return hasImagePaint(node) ? "image" : "group";
    default:
      return "shape";
  }
}

function hasImagePaint(node) {
  if (!("fills" in node)) {
    return false;
  }
  const fills = node.fills;
  if (!Array.isArray(fills)) {
    return false;
  }
  return fills.some(
    (paint) => paint && paint.type === "IMAGE" && paint.visible !== false,
  );
}

function buildDesignNote(node, commentLookup) {
  const description =
    typeof node.description === "string" ? node.description.trim() : "";
  const comments = commentLookup.has(node.id) ? commentLookup.get(node.id) : [];
  if (comments.length === 0) {
    return description;
  }
  const commentBlock = comments
    .map((comment) => `• ${comment}`)
    .join("\n");
  if (!description) {
    return `[comments]\n${commentBlock}`;
  }
  return `${description}\n\n[comments]\n${commentBlock}`;
}

function isCssTemplateNode(node, designNote) {
  const name = typeof node.name === "string" ? node.name.toLowerCase() : "";
  const note = designNote ? designNote.toLowerCase() : "";
  if (name.includes("css-template")) {
    return true;
  }
  if (note.includes("css-template")) {
    return true;
  }
  if (note.includes("css") && note.includes("html")) {
    return true;
  }
  return false;
}

function inferSemanticRole(node, designNote) {
  const candidates = [
    (node.name ? node.name : "").toLowerCase(),
    designNote ? designNote.toLowerCase() : "",
  ];
  const joined = candidates.join(" ");
  if (!joined) {
    return undefined;
  }
  if (joined.includes("button") || joined.includes("cta")) {
    return "button";
  }
  if (joined.includes("nav") || joined.includes("menu")) {
    return "navigation";
  }
  if (joined.includes("tab")) {
    return "tab";
  }
  if (joined.includes("link")) {
    return "link";
  }
  if (joined.includes("dialog") || joined.includes("modal")) {
    return "dialog";
  }
  if (joined.includes("hero") || joined.includes("visual")) {
    return "img";
  }
  if (joined.includes("input") || joined.includes("field")) {
    return "input";
  }
  if (joined.includes("footer")) {
    return "contentinfo";
  }
  if (joined.includes("header") || joined.includes("topbar")) {
    return "banner";
  }
  if (joined.includes("list") || joined.includes("collection")) {
    return "list";
  }
  return undefined;
}

function extractInteractions(node) {
  if (!("reactions" in node) || !Array.isArray(node.reactions)) {
    return [];
  }
  return node.reactions
    .map((reaction) => {
      if (!reaction) {
        return undefined;
      }
      let trigger;
      if (reaction.trigger) {
        trigger = {
          type: reaction.trigger.type,
        };
        if (reaction.trigger.device) {
          trigger.device = reaction.trigger.device;
        }
      }
      let action;
      if (reaction.action) {
        action = {
          type: reaction.action.type,
          destinationId: reaction.action.destinationId,
          navigation: reaction.action.navigation,
        };
        if (reaction.action.transition) {
          action.transition = {
            type: reaction.action.transition.type,
            duration: reaction.action.transition.duration,
          };
        }
      }
      if (!trigger && !action) {
        return undefined;
      }
      return {
        trigger,
        action,
      };
    })
    .filter(Boolean);
}

function extractFillColor(node) {
  if (!("fills" in node)) {
    return undefined;
  }
  const fills = node.fills;
  if (!Array.isArray(fills) || fills.length === 0) {
    return undefined;
  }
  const solid = fills.find(
    (paint) => paint && paint.type === "SOLID" && paint.visible !== false,
  );
  if (!solid || solid.type !== "SOLID") {
    return undefined;
  }
  return rgbaToHex(solid.color, typeof solid.opacity !== "undefined" && solid.opacity !== null ? solid.opacity : 1);
}

function extractStroke(node) {
  if (!("strokes" in node)) {
    return undefined;
  }
  const strokes = node.strokes;
  if (!Array.isArray(strokes) || strokes.length === 0) {
    return undefined;
  }
  const solid = strokes.find(
    (paint) => paint && paint.type === "SOLID" && paint.visible !== false,
  );
  if (!solid || solid.type !== "SOLID") {
    return undefined;
  }
  const weight = "strokeWeight" in node ? node.strokeWeight : undefined;
  return {
    color: rgbaToHex(solid.color, typeof solid.opacity !== "undefined" && solid.opacity !== null ? solid.opacity : 1),
    weight: typeof weight === "number" ? weight : undefined,
  };
}

function extractTextStyle(node) {
  return {
    fontSize: node.fontSize,
    fontName: tryGetFontName(node),
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    lineHeight: node.lineHeight,
    letterSpacing: node.letterSpacing,
  };
}

function tryGetFontName(node) {
  try {
    const fontName = node.getRangeFontName(0, Math.min(1, node.characters.length));
    if (fontName !== figma.mixed && fontName) {
      return fontName;
    }
  } catch (error) {
    console.warn("[export] font read failure:", error);
  }
  return undefined;
}

function extractConstraints(node) {
  if (!("constraints" in node)) {
    return undefined;
  }
  const { horizontal, vertical } = node.constraints;
  return { horizontal, vertical };
}

function extractResponsiveSpec(node) {
  const spec = {};
  if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
    spec.type = "autoLayout";
    spec.layoutMode = node.layoutMode;
    spec.primaryAxisSizingMode = node.primaryAxisSizingMode;
    spec.counterAxisSizingMode = node.counterAxisSizingMode;
    spec.primaryAxisAlign = node.primaryAxisAlignItems;
    spec.counterAxisAlign = node.counterAxisAlignItems;
    spec.padding = {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft,
    };
    spec.itemSpacing = node.itemSpacing;
    if ("layoutWrap" in node) {
      spec.layoutWrap = node.layoutWrap;
    }
    if ("overflowDirection" in node) {
      spec.overflowDirection = node.overflowDirection;
    }
    spec.layoutSizingHorizontal = node.layoutSizingHorizontal;
    spec.layoutSizingVertical = node.layoutSizingVertical;
    spec.minWidth = typeof node.minWidth !== "undefined" ? node.minWidth : undefined;
    spec.maxWidth = typeof node.maxWidth !== "undefined" ? node.maxWidth : undefined;
    spec.minHeight = typeof node.minHeight !== "undefined" ? node.minHeight : undefined;
    spec.maxHeight = typeof node.maxHeight !== "undefined" ? node.maxHeight : undefined;
  } else if ("constraints" in node) {
    spec.type = "constraints";
    spec.horizontal = node.constraints.horizontal;
    spec.vertical = node.constraints.vertical;
    spec.layoutSizingHorizontal = node.layoutSizingHorizontal;
    spec.layoutSizingVertical = node.layoutSizingVertical;
  }
  return Object.keys(spec).length > 0 ? spec : undefined;
}

function computeContrastData(node) {
  const textColor = extractFillColor(node);
  if (!textColor) {
    return undefined;
  }
  const background = findBackgroundColor(node);
  if (!background) {
    return undefined;
  }
  const ratio = contrastRatio(hexToRgb(textColor), hexToRgb(background));
  if (!Number.isFinite(ratio)) {
    return undefined;
  }
  const isLargeText =
    Number(node.fontSize) >= 18 ||
    (Number(node.fontSize) >= 14 && node.fontWeight >= 700);
  return {
    value: Math.round(ratio * 100) / 100,
    passesAA: ratio >= (isLargeText ? 3 : 4.5),
    passesAAA: ratio >= (isLargeText ? 4.5 : 7),
    textColor,
    backgroundColor: background,
  };
}

function findBackgroundColor(node) {
  let current = node.parent;
  while (current) {
    if ("fills" in current) {
      const fills = current.fills;
      if (Array.isArray(fills)) {
        const solid = fills.find(
          (paint) => paint && paint.type === "SOLID" && paint.visible !== false,
        );
        if (solid && solid.type === "SOLID") {
          return rgbaToHex(solid.color, typeof solid.opacity !== "undefined" && solid.opacity !== null ? solid.opacity : 1);
        }
      }
    }
    current = current.parent;
  }
  return undefined;
}

function contrastRatio(foreground, background) {
  if (!foreground || !background) {
    return NaN;
  }
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color) {
  const [r, g, b] = color.map((value) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length === 6) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }
  if (normalized.length === 8) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }
  return undefined;
}

function determineAssetStrategy(node, designNote, naming) {
  const note = designNote ? designNote.toLowerCase() : "";
  const name = (node.name ? node.name : "").toLowerCase();
  const forcePng = note.includes("format=png") || note.includes("png-only");
  const forceJpg =
    note.includes("format=jpg") ||
    note.includes("jpg-only") ||
    note.includes("jpeg") ||
    note.includes("写真") ||
    note.includes("photo");
  const looksLikePhoto =
    hasImagePaint(node) &&
    !/icon|logo|badge|btn|button/.test(name) &&
    (name.includes("photo") ||
      name.includes("image") ||
      name.includes("bg") ||
      note.includes("photo"));
  const availableFormats = ["PNG", "JPG", "WEBP"];
  let format = "PNG";
  let reason = "default";
  if (!forcePng && (forceJpg || looksLikePhoto)) {
    format = "JPG";
    reason = forceJpg ? "forced-by-note" : "auto-photo-detect";
  }
  if (forcePng) {
    format = "PNG";
    reason = "forced-by-note";
  }
  const extension = format.toLowerCase();
  return {
    format,
    extension,
    availableFormats,
    reason,
    section: naming.section,
  };
}

async function exportAssets(requests) {
  const result = [];
  for (const request of requests.values()) {
    try {
      const exportOptions = {
        format: request.format,
        contentsOnly: true,
        suffix: "",
        constraint: { type: "SCALE", value: 1 },
      };
      if (request.format === "JPG") {
        exportOptions.jpgQuality = 0.9;
      }
      const bytes = await request.node.exportAsync(exportOptions);
      const base64 = figma.base64Encode(bytes);
      const hash = await computeSha256(bytes);
      result.push({
        id: request.id,
        layoutId: request.layoutId,
        hash,
        format: request.format,
        section: request.section,
        area: request.area,
        baseName: request.baseName,
        fileName: request.fileName,
        base64,
        availableFormats: request.availableFormats,
        autoFormatReason: request.autoFormatReason,
      });
    } catch (error) {
      console.warn("[export] asset export failed:", request.fileName, error);
    }
  }
  return result;
}

async function computeSha256(bytes) {
  try {
    const buffer =
      bytes instanceof Uint8Array
        ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        : bytes;
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return bytesToHex(new Uint8Array(digest));
  } catch (error) {
    console.warn("[export] unable to compute hash:", error);
    return "";
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function exportFramePreview(frame, layoutName) {
  try {
    const bytes = await frame.exportAsync({
      format: "PNG",
      contentsOnly: true,
      constraint: { type: "SCALE", value: 0.4 },
    });
    const base64 = figma.base64Encode(bytes);
    const hash = await computeSha256(bytes);
    return {
      id: `${layoutName}_preview`,
      fileName: `${layoutName}.preview.png`,
      format: "PNG",
      base64,
      hash,
    };
  } catch (error) {
    console.warn("[export] preview export failed:", error);
    return undefined;
  }
}

function deriveAssetNaming(node, rootFrame) {
  const section = getSectionKey(node);
  const area = getAreaKey(node, rootFrame, section);
  const baseName = inferSemanticName(node.name);
  const key = `${section}__${area}__${baseName}`;
  const nextIndex = (assetCounters.has(key) ? assetCounters.get(key) : 0) + 1;
  assetCounters.set(key, nextIndex);
  const suffix = nextIndex.toString().padStart(2, "0");
  return {
    section,
    area,
    baseName,
    index: nextIndex,
    fullName: `${section}_${area}_${baseName}_${suffix}`,
  };
}

const assetCounters = new Map();

function getSectionKey(node) {
  if ("sectionId" in node && node.sectionId) {
    const sectionNode = figma.getNodeById(String(node.sectionId));
    if (sectionNode && sectionNode.type === "SECTION") {
      const slug = slugify(sectionNode.name ? sectionNode.name : "");
      if (slug) {
        return slug;
      }
    }
  }
  return "global";
}

function getAreaKey(node, rootFrame, sectionKey) {
  let current = node;
  let candidate = null;
  while (current) {
    const parent = current.parent;
    if (!parent) {
      break;
    }
    if (parent.id === rootFrame.id || parent.type === "SECTION") {
      break;
    }
    if (
      parent.type === "FRAME" ||
      parent.type === "GROUP" ||
      parent.type === "COMPONENT" ||
      parent.type === "INSTANCE"
    ) {
      candidate = parent;
    }
    current = parent;
  }
  if (candidate) {
    const slug = slugify(candidate.name ? candidate.name : "");
    if (slug) {
      return slug;
    }
  }
  const fallback = slugify(String(typeof rootFrame.name !== "undefined" ? rootFrame.name : sectionKey));
  return fallback || sectionKey;
}

function inferSemanticName(name) {
  if (!name) {
    return "image";
  }
  const normalized = slugify(name.replace(/\d+/g, "").trim());
  return normalized || "image";
}

function rgbaToHex(color, opacity) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const resolvedOpacity = typeof opacity !== "undefined" && opacity !== null ? opacity : 1;
  const a = Math.round(resolvedOpacity * 255);
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a === 255) {
    return hex;
  }
  return `${hex}${toHex(a)}`;
}

function toHex(value) {
  return value.toString(16).padStart(2, "0");
}

function clampNumber(value, min, max) {
  const safe = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(safe, min), max);
}

function createIdFactory(prefix = "node") {
  const used = new Set();
  return (rawId, index) => {
    if (rawId) {
      const slug = slugify(rawId);
      if (slug && !used.has(slug)) {
        used.add(slug);
        return slug;
      }
    }
    let suffix = index;
    let candidate = "";
    do {
      candidate = `${prefix}_${suffix}`;
      suffix += 1;
    } while (used.has(candidate));
    used.add(candidate);
    return candidate;
  };
}

function slugify(value) {
  if (typeof value !== "string") {
    if (value == null) {
      value = "";
    }
  }
  const text = String(value);
  if (!text) {
    return "";
  }
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function collectComments(frame, nodeIdSet) {
  const lookup = new Map();
  try {
    const comments = await tryFetchComments(frame);
    comments.forEach((comment) => {
      const nodeId = comment && comment.client_meta ? comment.client_meta.node_id : undefined;
      if (!nodeId || !nodeIdSet.has(nodeId)) {
        return;
      }
      const userInfo = comment && comment.user ? comment.user : {};
      const author = userInfo.handle ? userInfo.handle : (userInfo.name ? userInfo.name : "unknown");
      const date = comment.created_at
        ? comment.created_at.split("T")[0]
        : "";
      const message = comment && comment.message ? comment.message.trim() : "";
      if (!message) {
        return;
      }
      const formatted = date
        ? `@${author} (${date}) ${message}`
        : `@${author} ${message}`;
      const existing = lookup.has(nodeId) ? lookup.get(nodeId) : [];
      existing.push(formatted);
      lookup.set(nodeId, existing);
    });
  } catch (error) {
    console.warn("[export] comment fetch skipped:", error);
  }
  return lookup;
}

async function tryFetchComments(frame) {
  if (typeof figma.getLocalCommentIdsAsync === "function" && typeof figma.getCommentByIdAsync === "function") {
    const ids = await figma.getLocalCommentIdsAsync();
    const comments = await Promise.all(
      ids.map(async (id) => {
        try {
          return await figma.getCommentByIdAsync(id);
        } catch (error) {
          console.warn("[export] comment read failed:", id, error);
          return undefined;
        }
      }),
    );
    return comments.filter(Boolean);
  }
  const token = await readCommentToken();
  if (!token) {
    return [];
  }
  const fileKey = figma.fileKey;
  if (!fileKey) {
    return [];
  }
  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
    method: "GET",
    headers: {
      "X-Figma-Token": token,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Comments API error: ${response.status}`);
  }
  const data = await response.json();
  return data && Array.isArray(data.comments) ? data.comments : [];
}

async function readCommentToken() {
  try {
    const stored = await figma.clientStorage.getAsync("codex.commentToken");
    if (typeof stored === "string" && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch {
    // ignore
  }
  try {
    const shared = figma.root.getSharedPluginData("codex", "commentToken");
    if (typeof shared === "string" && shared.trim().length > 0) {
      return shared.trim();
    }
  } catch {
    // ignore
  }
  return undefined;
}

function summarizeComments(map) {
  const total = Array.from(map.values()).reduce((acc, items) => acc + items.length, 0);
  return {
    nodeCount: map.size,
    total,
  };
}

function buildCssSnippet(node) {
  const decls = [];
  decls.push(`width: ${round(node.width)}px;`);
  decls.push(`height: ${round(node.height)}px;`);

  if ("cornerRadius" in node) {
    const corners = [
      node.topLeftRadius,
      node.topRightRadius,
      node.bottomRightRadius,
      node.bottomLeftRadius,
    ].map((value) => (typeof value === "number" ? `${round(value)}px` : "0"));
    if (corners.every((value) => value === corners[0])) {
      decls.push(`border-radius: ${corners[0]};`);
    } else {
      decls.push(`border-radius: ${corners.join(" ")};`);
    }
  }

  const background = buildBackgroundCss(node);
  if (background) {
    decls.push(`background: ${background};`);
  }

  const stroke = extractStroke(node);
  if (stroke && stroke.color && stroke.weight) {
    decls.push(`border: ${round(stroke.weight)}px solid ${stroke.color};`);
  }

  const shadows = buildShadowCss(node);
  if (shadows.length > 0) {
    decls.push(`box-shadow: ${shadows.join(", ")};`);
  }

  if ("opacity" in node && typeof node.opacity === "number" && node.opacity < 1) {
    decls.push(`opacity: ${node.opacity.toFixed(2)};`);
  }

  if ("effects" in node) {
    const blur = node.effects.find((effect) => effect.type === "LAYER_BLUR" && effect.visible !== false);
    if (blur && blur.type === "LAYER_BLUR") {
      decls.push(`backdrop-filter: blur(${round(blur.radius)}px);`);
    }
  }

  return decls.join("\n");
}

function buildBackgroundCss(node) {
  if (!("fills" in node)) {
    return undefined;
  }
  const fills = node.fills;
  if (!Array.isArray(fills) || fills.length === 0) {
    return undefined;
  }
  const visibleFills = fills.filter((fill) => fill && fill.visible !== false);
  if (visibleFills.length === 0) {
    return undefined;
  }
  const first = visibleFills[0];
  if (first.type === "SOLID") {
    return rgbaToHex(first.color, typeof first.opacity !== "undefined" && first.opacity !== null ? first.opacity : 1);
  }
  if (
    first.type === "GRADIENT_LINEAR" ||
    first.type === "GRADIENT_RADIAL" ||
    first.type === "GRADIENT_ANGULAR"
  ) {
    return gradientToCss(first);
  }
  return undefined;
}

function gradientToCss(fill) {
  if (!fill.gradientStops || fill.gradientStops.length === 0) {
    return undefined;
  }
  const stops = fill.gradientStops
    .map((stop) => {
      const color = rgbaToHex(stop.color, typeof stop.color.a !== "undefined" && stop.color.a !== null ? stop.color.a : 1);
      const position = Math.round(stop.position * 100);
      return `${color} ${position}%`;
    })
    .join(", ");

  if (fill.type === "GRADIENT_LINEAR" && fill.gradientTransform) {
    const angle = gradientAngle(fill.gradientTransform);
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  if (fill.type === "GRADIENT_RADIAL") {
    return `radial-gradient(${stops})`;
  }
  if (fill.type === "GRADIENT_ANGULAR") {
    return `conic-gradient(${stops})`;
  }
  return undefined;
}

function gradientAngle(transform) {
  const [x1, y1] = transform[0];
  const [x2, y2] = transform[1];
  const angle = (Math.atan2(y1 - y2, x1 - x2) * 180) / Math.PI;
  return Math.round((angle + 360) % 360);
}

function buildShadowCss(node) {
  if (!("effects" in node)) {
    return [];
  }
  const effects = node.effects;
  if (!Array.isArray(effects)) {
    return [];
  }
  return effects
    .filter((effect) => effect.visible !== false && effect.type === "DROP_SHADOW")
    .map((effect) => {
      if (effect.type !== "DROP_SHADOW") {
        return undefined;
      }
      const color = rgbaToHex(effect.color, typeof effect.color.a !== "undefined" && effect.color.a !== null ? effect.color.a : 1);
      return `${round(effect.offset.x)}px ${round(effect.offset.y)}px ${round(effect.radius)}px ${round(effect.spread)}px ${color}`;
    })
    .filter(Boolean);
}

async function attachCssPreview(layoutObject, node) {
  try {
    const bytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 0.25 },
      useAbsoluteBounds: false,
      contentsOnly: true,
    });
    const base64 = figma.base64Encode(bytes);
    const hash = await computeSha256(bytes);
    layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
      cssPreviewHash: hash,
      cssPreviewBase64: base64,
    });
  } catch (error) {
    console.warn("[export] css preview failed:", node.name, error);
  }
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}
