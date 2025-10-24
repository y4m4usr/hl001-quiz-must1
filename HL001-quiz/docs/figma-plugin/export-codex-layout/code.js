/**
 * HL001 Figma Export Plugin Guideline
 * -----------------------------------
 * 1. すべてのアセットは layout JSON の `imageId` と同じ命名規則
 *    (例: global_screen_home_h_btn_daily_01) にリネームして書き出す。
 * 2. layout JSON には参照画像 ID / section / area を必ず記録し、
 *    Codex / CloudCode が座標と PNG を 1:1 で突き合わせられる形にする。
 * 3. エクスポート完了時に UI は
 *      `codex ui-assets sync ./exports/<layout>.zip`
 *    を実行するよう案内し、Zip 内に JSON + PNG を格納する。
 *    Codex / CloudCode 側はこのコマンドを受け取ったら GitHub への push と
 *    GAS デプロイまで自動で行う前提でワークフローを設計している。
 * 4. ユーザーの確認は最終チェックのみ。差し戻しが出ないレベルで
 *    プラグインと Codex が連携して成果物を渡す。
 */
"use strict";
figma.showUI(__html__, { width: 360, height: 340 });
figma.ui.onmessage = (msg) => {
    if ((msg === null || msg === void 0 ? void 0 : msg.type) === "CLOSE") {
        figma.closePlugin();
    }
};
const assetCounters = new Map();
void run();
async function run() {
    const frame = pickTargetFrame();
    if (!frame) {
        figma.notify("フレームを1つ選択してください。");
        figma.ui.postMessage({
            type: "EXPORT_ERROR",
            message: "フレームが選択されていません。",
        });
        return;
    }
    assetCounters.clear();
    const { layout, assets } = await buildExport(frame);
    const payload = sanitizeForUi({ layout, assets });
    figma.ui.postMessage({
        type: "EXPORT_RESULT",
        payload,
    });
}
async function buildExport(frame) {
    var _a, _b;
    const frameBounds = (_a = frame.absoluteBoundingBox) !== null && _a !== void 0 ? _a : { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
    const layoutName = slugify(frame.name) || `frame_${frame.id.slice(-6)}`;
    const meta = {
        layoutName,
        canvasWidth: Number(frameBounds.width),
        canvasHeight: Number(frameBounds.height),
        generatedAt: new Date().toISOString(),
    };
    const originX = frameBounds.x;
    const originY = frameBounds.y;
    if (frame.backgrounds && frame.backgrounds.length > 0) {
        const firstBackground = frame.backgrounds.find((paint) => paint.type === "SOLID" && paint.visible !== false);
        if (firstBackground && firstBackground.type === "SOLID") {
            meta.backgroundColor = rgbaToHex(firstBackground.color, (_b = firstBackground.opacity) !== null && _b !== void 0 ? _b : 1);
        }
    }
    const idFactory = createIdFactory();
    const assetFactory = createIdFactory("asset");
    const assetRequests = new Map();
    const objects = [];
    const nodes = flattenScene(frame);
    nodes.forEach((node, index) => {
        var _a, _b, _c;
        if (!node.visible) {
            return;
        }
        const geometry = node.absoluteBoundingBox;
        if (!geometry) {
            return;
        }
        const layoutObject = {
            id: idFactory(node.name, index),
            type: mapNodeType(node),
            x: Number(geometry.x - originX),
            y: Number(geometry.y - originY),
            width: Number(geometry.width),
            height: Number(geometry.height),
        };
        if (node.name) {
            layoutObject.name = node.name;
        }
        if ("rotation" in node && typeof node.rotation === "number" && node.rotation !== 0) {
            layoutObject.rotation = node.rotation;
        }
        if ("opacity" in node && typeof node.opacity === "number") {
            layoutObject.opacity = clampNumber(node.opacity, 0, 1);
        }
        if (layoutObject.type === "image") {
            const naming = deriveAssetNaming(node, frame);
            layoutObject.imageId = naming.fullName;
            layoutObject.image = {
                id: naming.fullName,
                extension: "png",
                sources: [],
            };
            layoutObject.metadata = Object.assign(Object.assign({}, ((_a = layoutObject.metadata) !== null && _a !== void 0 ? _a : {})), { section: naming.section, area: naming.area, assetName: naming.fullName });
            if (!assetRequests.has(naming.fullName) && "exportAsync" in node) {
                assetRequests.set(naming.fullName, {
                    id: assetFactory(naming.fullName, index),
                    node: node,
                    format: "PNG",
                    fileName: `${naming.fullName}.png`,
                    section: naming.section,
                    area: naming.area,
                    baseName: naming.baseName,
                });
            }
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
            layoutObject.metadata = Object.assign(Object.assign({}, ((_b = layoutObject.metadata) !== null && _b !== void 0 ? _b : {})), { textStyle: extractTextStyle(node), textColor: extractFillColor(node) });
        }
        const constraints = extractConstraints(node);
        if (constraints) {
            layoutObject.metadata = Object.assign(Object.assign({}, ((_c = layoutObject.metadata) !== null && _c !== void 0 ? _c : {})), { constraints });
        }
        if (node.type !== "TEXT" && node.type !== "SLICE" && node.type !== "GROUP") {
            const fill = extractFillColor(node);
            if (fill && !layoutObject.fill) {
                layoutObject.fill = fill;
            }
        }
        objects.push(layoutObject);
    });
    const assets = await exportAssets(assetRequests);
    return {
        layout: {
            meta,
            objects,
        },
        assets,
    };
}
function pickTargetFrame() {
    var _a;
    const selection = figma.currentPage.selection;
    if (selection.length === 1 && selection[0].type === "FRAME") {
        return selection[0];
    }
    const frameInSelection = selection.find((node) => node.type === "FRAME");
    if (frameInSelection) {
        return frameInSelection;
    }
    const firstFrame = figma.currentPage.findAll((node) => node.type === "FRAME")[0];
    return (_a = firstFrame) !== null && _a !== void 0 ? _a : null;
}
function flattenScene(root) {
    const result = [];
    const queue = [...root.children];
    while (queue.length > 0) {
        const node = queue.shift();
        result.push(node);
        if ("children" in node) {
            queue.push(...node.children);
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
            return "group";
        case "GROUP":
            return "group";
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
    return fills.some((paint) => (paint === null || paint === void 0 ? void 0 : paint.type) === "IMAGE" && paint.visible !== false);
}
function extractFillColor(node) {
    var _a;
    if (!("fills" in node)) {
        return undefined;
    }
    const fills = node.fills;
    if (!Array.isArray(fills) || fills.length === 0) {
        return undefined;
    }
    const solid = fills.find((paint) => (paint === null || paint === void 0 ? void 0 : paint.type) === "SOLID" && paint.visible !== false);
    if (!solid || solid.type !== "SOLID") {
        return undefined;
    }
    return rgbaToHex(solid.color, (_a = solid.opacity) !== null && _a !== void 0 ? _a : 1);
}
function extractStroke(node) {
    var _a;
    if (!("strokes" in node)) {
        return undefined;
    }
    const strokes = node.strokes;
    if (!Array.isArray(strokes) || strokes.length === 0) {
        return undefined;
    }
    const solid = strokes.find((paint) => (paint === null || paint === void 0 ? void 0 : paint.type) === "SOLID" && paint.visible !== false);
    if (!solid || solid.type !== "SOLID") {
        return undefined;
    }
    const weight = "strokeWeight" in node ? node.strokeWeight : undefined;
    return {
        color: rgbaToHex(solid.color, (_a = solid.opacity) !== null && _a !== void 0 ? _a : 1),
        weight: typeof weight === "number" ? weight : undefined,
    };
}
function extractTextStyle(node) {
    const fontName = tryGetFontName(node);
    return {
        fontSize: node.fontSize,
        fontName,
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
    }
    catch (error) {
        console.warn("[export] Unable to read font name:", error);
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
function deriveAssetNaming(node, rootFrame) {
    var _a;
    const section = getSectionKey(node);
    const area = getAreaKey(node, rootFrame, section);
    const baseName = inferSemanticName(node.name);
    const counterKey = `${section}__${area}__${baseName}`;
    const nextIndex = ((_a = assetCounters.get(counterKey)) !== null && _a !== void 0 ? _a : 0) + 1;
    assetCounters.set(counterKey, nextIndex);
    const suffix = nextIndex.toString().padStart(2, "0");
    return {
        section,
        area,
        baseName,
        index: nextIndex,
        fullName: `${section}_${area}_${baseName}_${suffix}`,
    };
}
function getSectionKey(node) {
    if ("sectionId" in node && node.sectionId) {
        const sectionNode = figma.getNodeById(String(node.sectionId));
        if (sectionNode && sectionNode.type === "SECTION") {
            const sectionName = typeof sectionNode.name === "string" ? sectionNode.name : "";
            const slug = slugify(sectionName);
            if (slug.length > 0) {
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
        if (parent.id === rootFrame.id) {
            break;
        }
        if (parent.type === "SECTION") {
            break;
        }
        if (parent.type === "FRAME" ||
            parent.type === "GROUP" ||
            parent.type === "COMPONENT" ||
            parent.type === "INSTANCE") {
            candidate = parent;
        }
        current = parent;
    }
    if (candidate) {
        const candidateName = typeof (candidate === null || candidate === void 0 ? void 0 : candidate.name) === "string" ? candidate.name : "area";
        const slug = slugify(candidateName);
        if (slug.length > 0) {
            return slug;
        }
    }
    const fallback = slugify(String(rootFrame.name || sectionKey));
    return fallback.length > 0 ? fallback : sectionKey;
}
function inferSemanticName(name) {
    if (!name) {
        return "image";
    }
    const normalized = slugify(name.replace(/\d+/g, "").trim());
    if (normalized.length > 0) {
        return normalized;
    }
    return "image";
}
async function exportAssets(requests) {
    const assets = [];
    for (const request of requests.values()) {
        try {
            const bytes = await request.node.exportAsync({
                format: request.format,
                useAbsoluteBounds: true,
            });
            // Uint8Array を Base64 文字列に変換（postMessage でシリアライズ可能）
            const base64 = uint8ArrayToBase64(bytes);
            assets.push({
                id: request.id,
                fileName: request.fileName,
                format: request.format,
                base64: base64,
                section: request.section,
                area: request.area,
                baseName: request.baseName,
            });
        }
        catch (error) {
            console.warn(`[export] Failed to export ${request.fileName}:`, error);
        }
    }
    return assets;
}

// Uint8Array を Base64 文字列に変換
function uint8ArrayToBase64(bytes) {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa === "function") {
        return btoa(binary);
    }
    return manualBase64(binary);
}
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function manualBase64(binary) {
    let base64 = '';
    let i = 0;
    while (i < binary.length) {
        const c1 = binary.charCodeAt(i++);
        const c2 = binary.charCodeAt(i++);
        const c3 = binary.charCodeAt(i++);
        const e1 = c1 >> 2;
        const e2 = ((c1 & 3) << 4) | (c2 >> 4);
        let e3 = ((c2 & 15) << 2) | (c3 >> 6);
        let e4 = c3 & 63;
        if (isNaN(c2)) {
            e3 = 64;
            e4 = 64;
        }
        else if (isNaN(c3)) {
            e4 = 64;
        }
        base64 += BASE64_CHARS.charAt(e1)
            + BASE64_CHARS.charAt(e2)
            + BASE64_CHARS.charAt(e3)
            + BASE64_CHARS.charAt(e4);
    }
    return base64;
}
function rgbaToHex(color, opacity) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = Math.round(opacity * 255);
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
        value = value !== null && value !== void 0 ? value : "";
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
function sanitizeForUi(data) {
    try {
        return JSON.parse(JSON.stringify(data));
    }
    catch (error) {
        console.warn('[export] sanitize failed:', error);
        return data;
    }
}
