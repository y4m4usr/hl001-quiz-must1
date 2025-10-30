var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
(function () {
    try {
        figma.notify("Codex Exporter: 起動チェック中…", { timeout: 3000 });
        if (typeof __html__ === "undefined" || __html__ == null) {
            throw new Error("__html__ is undefined. The UI bundle was not embedded. Run the build step to inline ui.html before packaging the plugin.");
        }
        figma.showUI(__html__, { width: 440, height: 560 });
        console.log("[Codex Exporter] UI bootstrapped");
    }
    catch (error) {
        console.error("[Codex Exporter] Failed to launch UI:", error);
        figma.notify("Codex Exporter: UI を起動できません。開発者コンソールを確認してください。");
        throw error;
    }
})();
var exportInProgress = false;
function mergeMetadata(base, additions) {
    var result = {};
    var key;
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
figma.ui.onmessage = function (msg) {
    var type = msg && typeof msg.type !== "undefined" ? msg.type : "";
    if (type === "CLOSE") {
        figma.closePlugin();
        return;
    }
    if (type === "READY" && !exportInProgress) {
        void runExport();
    }
};
function runExport() {
    return __awaiter(this, void 0, void 0, function () {
        var frame, payload, error_1, detail;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (exportInProgress) {
                        return [2 /*return*/];
                    }
                    exportInProgress = true;
                    frame = pickTargetFrame();
                    if (!frame) {
                        figma.notify("フレームを1つ選択してください。");
                        figma.ui.postMessage({
                            type: "EXPORT_ERROR",
                            message: "フレームが選択されていません。",
                        });
                        exportInProgress = false;
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, buildExport(frame)];
                case 2:
                    payload = _a.sent();
                    figma.ui.postMessage({
                        type: "EXPORT_RESULT",
                        payload: payload,
                    });
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error("[export] unexpected failure:", error_1);
                    detail = error_1 && typeof error_1.message === "string"
                        ? "エクスポートに失敗しました。\n" + error_1.message
                        : "エクスポートに失敗しました。";
                    figma.notify("エクスポートに失敗しました。コンソールを確認してください。");
                    figma.ui.postMessage({
                        type: "EXPORT_ERROR",
                        message: detail,
                    });
                    return [3 /*break*/, 5];
                case 4:
                    exportInProgress = false;
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function pickTargetFrame() {
    var selection = figma.currentPage.selection;
    if (selection.length === 1 && selection[0].type === "FRAME") {
        return selection[0];
    }
    var inSelection = selection.find(function (node) { return node.type === "FRAME"; });
    if (inSelection) {
        return inSelection;
    }
    var firstFrame = figma.currentPage
        .findAll(function (node) { return node.type === "FRAME"; })
        .at(0);
    return firstFrame || null;
}
function buildExport(frame) {
    return __awaiter(this, void 0, void 0, function () {
        var frameBounds, layoutName, meta, originX, originY, background, idFactory, assetIdFactory, nodeList, nodeIdSet, commentLookup, objects, assetRequests, cssPreviewTasks, assets, preview, hashMap, objects_1, objects_1_1, obj;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    frameBounds = getAbsoluteBounds(frame);
                    layoutName = slugify(frame.name) || "frame_".concat(frame.id.slice(-6));
                    meta = {
                        layoutName: layoutName,
                        canvasWidth: Number(frameBounds.width),
                        canvasHeight: Number(frameBounds.height),
                        generatedAt: new Date().toISOString(),
                        frameId: frame.id,
                        pageName: frame.parent && frame.parent.type === "PAGE" ? frame.parent.name : undefined,
                    };
                    originX = frameBounds.x;
                    originY = frameBounds.y;
                    if (frame.backgrounds && frame.backgrounds.length > 0) {
                        background = frame.backgrounds.find(function (paint) { return paint && paint.type === "SOLID" && paint.visible !== false; });
                        if (background && background.type === "SOLID") {
                            meta.backgroundColor = rgbaToHex(background.color, typeof background.opacity !== "undefined" && background.opacity !== null ? background.opacity : 1);
                        }
                    }
                    idFactory = createIdFactory();
                    assetIdFactory = createIdFactory("asset");
                    nodeList = flattenScene(frame);
                    nodeIdSet = new Set(nodeList.map(function (node) { return node.id; }));
                    return [4 /*yield*/, collectComments(frame, nodeIdSet)];
                case 1:
                    commentLookup = _b.sent();
                    meta.commentSummary = summarizeComments(commentLookup);
                    objects = [];
                    assetRequests = new Map();
                    cssPreviewTasks = [];
                    nodeList.forEach(function (node, index) {
                        if (!node.visible) {
                            return;
                        }
                        var geometry = node.absoluteBoundingBox;
                        if (!geometry) {
                            return;
                        }
                        var layoutObject = {
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
                        var designNote = buildDesignNote(node, commentLookup);
                        if (designNote) {
                            layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                designNote: designNote,
                            });
                        }
                        if ("rotation" in node && typeof node.rotation === "number" && node.rotation !== 0) {
                            layoutObject.rotation = node.rotation;
                        }
                        if ("opacity" in node && typeof node.opacity === "number") {
                            layoutObject.opacity = clampNumber(node.opacity, 0, 1);
                        }
                        var cssTemplate = isCssTemplateNode(node, designNote);
                        if (cssTemplate) {
                            layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                cssTemplate: true,
                            });
                        }
                        var semanticRole = inferSemanticRole(node, designNote);
                        if (semanticRole) {
                            layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                semanticRole: semanticRole,
                            });
                        }
                        var responsiveSpec = extractResponsiveSpec(node);
                        if (responsiveSpec) {
                            layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                responsiveSpec: responsiveSpec,
                            });
                        }
                        var interactions = extractInteractions(node);
                        if (interactions.length > 0) {
                            layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                interactionMap: interactions,
                            });
                        }
                        if (layoutObject.type === "shape") {
                            var fill = extractFillColor(node);
                            if (fill) {
                                layoutObject.fill = fill;
                            }
                            var stroke = extractStroke(node);
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
                            var contrast = computeContrastData(node);
                            if (contrast) {
                                layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                    a11y: {
                                        contrast: contrast,
                                        semanticRole: typeof semanticRole !== "undefined" ? semanticRole : undefined,
                                    },
                                });
                            }
                        }
                        var constraints = extractConstraints(node);
                        if (constraints) {
                            layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                constraints: constraints,
                            });
                        }
                        if (node.type !== "TEXT" &&
                            node.type !== "SLICE" &&
                            node.type !== "GROUP") {
                            var fill = extractFillColor(node);
                            if (fill && !layoutObject.fill) {
                                layoutObject.fill = fill;
                            }
                        }
                        if (layoutObject.type === "image" && !cssTemplate) {
                            var naming = deriveAssetNaming(node, frame);
                            var strategy = determineAssetStrategy(node, designNote, naming);
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
                                    node: node,
                                    format: strategy.format,
                                    extension: strategy.extension,
                                    fileName: "".concat(naming.fullName, ".").concat(strategy.extension),
                                    section: naming.section,
                                    area: naming.area,
                                    baseName: naming.baseName,
                                    availableFormats: strategy.availableFormats,
                                    autoFormatReason: strategy.reason,
                                });
                            }
                        }
                        if (cssTemplate) {
                            var cssSnippet = buildCssSnippet(node);
                            if (cssSnippet) {
                                layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                                    cssSnippet: cssSnippet,
                                });
                            }
                            cssPreviewTasks.push(attachCssPreview(layoutObject, node));
                        }
                        objects.push(layoutObject);
                    });
                    return [4 /*yield*/, exportAssets(assetRequests)];
                case 2:
                    assets = _b.sent();
                    return [4 /*yield*/, exportFramePreview(frame, layoutName)];
                case 3:
                    preview = _b.sent();
                    return [4 /*yield*/, Promise.all(cssPreviewTasks)];
                case 4:
                    _b.sent();
                    if (assets.length > 0) {
                        hashMap = new Map(assets.map(function (asset) { return [asset.layoutId, asset.hash]; }));
                        try {
                            for (objects_1 = __values(objects), objects_1_1 = objects_1.next(); !objects_1_1.done; objects_1_1 = objects_1.next()) {
                                obj = objects_1_1.value;
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
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (objects_1_1 && !objects_1_1.done && (_a = objects_1.return)) _a.call(objects_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    }
                    return [2 /*return*/, {
                            layout: {
                                meta: meta,
                                objects: objects,
                            },
                            assets: assets,
                            preview: preview,
                        }];
            }
        });
    });
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
    var result = [];
    var queue = root.children ? root.children.slice() : [];
    while (queue.length > 0) {
        var node = queue.shift();
        result.push(node);
        if ("children" in node && node.children) {
            for (var i = 0; i < node.children.length; i += 1) {
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
    var fills = node.fills;
    if (!Array.isArray(fills)) {
        return false;
    }
    return fills.some(function (paint) { return paint && paint.type === "IMAGE" && paint.visible !== false; });
}
function buildDesignNote(node, commentLookup) {
    var description = typeof node.description === "string" ? node.description.trim() : "";
    var comments = commentLookup.has(node.id) ? commentLookup.get(node.id) : [];
    if (comments.length === 0) {
        return description;
    }
    var commentBlock = comments
        .map(function (comment) { return "\u2022 ".concat(comment); })
        .join("\n");
    if (!description) {
        return "[comments]\n".concat(commentBlock);
    }
    return "".concat(description, "\n\n[comments]\n").concat(commentBlock);
}
function isCssTemplateNode(node, designNote) {
    var name = typeof node.name === "string" ? node.name.toLowerCase() : "";
    var note = designNote ? designNote.toLowerCase() : "";
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
    var candidates = [
        (node.name ? node.name : "").toLowerCase(),
        designNote ? designNote.toLowerCase() : "",
    ];
    var joined = candidates.join(" ");
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
        .map(function (reaction) {
        if (!reaction) {
            return undefined;
        }
        var trigger;
        if (reaction.trigger) {
            trigger = {
                type: reaction.trigger.type,
            };
            if (reaction.trigger.device) {
                trigger.device = reaction.trigger.device;
            }
        }
        var action;
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
            trigger: trigger,
            action: action,
        };
    })
        .filter(Boolean);
}
function extractFillColor(node) {
    if (!("fills" in node)) {
        return undefined;
    }
    var fills = node.fills;
    if (!Array.isArray(fills) || fills.length === 0) {
        return undefined;
    }
    var solid = fills.find(function (paint) { return paint && paint.type === "SOLID" && paint.visible !== false; });
    if (!solid || solid.type !== "SOLID") {
        return undefined;
    }
    return rgbaToHex(solid.color, typeof solid.opacity !== "undefined" && solid.opacity !== null ? solid.opacity : 1);
}
function extractStroke(node) {
    if (!("strokes" in node)) {
        return undefined;
    }
    var strokes = node.strokes;
    if (!Array.isArray(strokes) || strokes.length === 0) {
        return undefined;
    }
    var solid = strokes.find(function (paint) { return paint && paint.type === "SOLID" && paint.visible !== false; });
    if (!solid || solid.type !== "SOLID") {
        return undefined;
    }
    var weight = "strokeWeight" in node ? node.strokeWeight : undefined;
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
        var fontName = node.getRangeFontName(0, Math.min(1, node.characters.length));
        if (fontName !== figma.mixed && fontName) {
            return fontName;
        }
    }
    catch (error) {
        console.warn("[export] font read failure:", error);
    }
    return undefined;
}
function extractConstraints(node) {
    if (!("constraints" in node)) {
        return undefined;
    }
    var _a = node.constraints, horizontal = _a.horizontal, vertical = _a.vertical;
    return { horizontal: horizontal, vertical: vertical };
}
function extractResponsiveSpec(node) {
    var spec = {};
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
    }
    else if ("constraints" in node) {
        spec.type = "constraints";
        spec.horizontal = node.constraints.horizontal;
        spec.vertical = node.constraints.vertical;
        spec.layoutSizingHorizontal = node.layoutSizingHorizontal;
        spec.layoutSizingVertical = node.layoutSizingVertical;
    }
    return Object.keys(spec).length > 0 ? spec : undefined;
}
function computeContrastData(node) {
    var textColor = extractFillColor(node);
    if (!textColor) {
        return undefined;
    }
    var background = findBackgroundColor(node);
    if (!background) {
        return undefined;
    }
    var ratio = contrastRatio(hexToRgb(textColor), hexToRgb(background));
    if (!Number.isFinite(ratio)) {
        return undefined;
    }
    var isLargeText = Number(node.fontSize) >= 18 ||
        (Number(node.fontSize) >= 14 && node.fontWeight >= 700);
    return {
        value: Math.round(ratio * 100) / 100,
        passesAA: ratio >= (isLargeText ? 3 : 4.5),
        passesAAA: ratio >= (isLargeText ? 4.5 : 7),
        textColor: textColor,
        backgroundColor: background,
    };
}
function findBackgroundColor(node) {
    var current = node.parent;
    while (current) {
        if ("fills" in current) {
            var fills = current.fills;
            if (Array.isArray(fills)) {
                var solid = fills.find(function (paint) { return paint && paint.type === "SOLID" && paint.visible !== false; });
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
    var l1 = relativeLuminance(foreground);
    var l2 = relativeLuminance(background);
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}
function relativeLuminance(color) {
    var _a = __read(color.map(function (value) {
        var srgb = value / 255;
        return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    }), 3), r = _a[0], g = _a[1], b = _a[2];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function hexToRgb(hex) {
    var normalized = hex.replace("#", "");
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
    var note = designNote ? designNote.toLowerCase() : "";
    var name = (node.name ? node.name : "").toLowerCase();
    var forcePng = note.includes("format=png") || note.includes("png-only");
    var forceJpg = note.includes("format=jpg") ||
        note.includes("jpg-only") ||
        note.includes("jpeg") ||
        note.includes("写真") ||
        note.includes("photo");
    var looksLikePhoto = hasImagePaint(node) &&
        !/icon|logo|badge|btn|button/.test(name) &&
        (name.includes("photo") ||
            name.includes("image") ||
            name.includes("bg") ||
            note.includes("photo"));
    var availableFormats = ["PNG", "JPG", "WEBP"];
    var format = "PNG";
    var reason = "default";
    if (!forcePng && (forceJpg || looksLikePhoto)) {
        format = "JPG";
        reason = forceJpg ? "forced-by-note" : "auto-photo-detect";
    }
    if (forcePng) {
        format = "PNG";
        reason = "forced-by-note";
    }
    var extension = format.toLowerCase();
    return {
        format: format,
        extension: extension,
        availableFormats: availableFormats,
        reason: reason,
        section: naming.section,
    };
}
function exportAssets(requests) {
    return __awaiter(this, void 0, void 0, function () {
        var result, _a, _b, request, exportOptions, bytes, base64, hash, error_2, e_2_1;
        var e_2, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    result = [];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 9, 10, 11]);
                    _a = __values(requests.values()), _b = _a.next();
                    _d.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 8];
                    request = _b.value;
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 6, , 7]);
                    exportOptions = {
                        format: request.format,
                        contentsOnly: true,
                        suffix: "",
                        constraint: { type: "SCALE", value: 1 },
                    };
                    if (request.format === "JPG") {
                        exportOptions.jpgQuality = 0.9;
                    }
                    return [4 /*yield*/, request.node.exportAsync(exportOptions)];
                case 4:
                    bytes = _d.sent();
                    base64 = figma.base64Encode(bytes);
                    return [4 /*yield*/, computeSha256(bytes)];
                case 5:
                    hash = _d.sent();
                    result.push({
                        id: request.id,
                        layoutId: request.layoutId,
                        hash: hash,
                        format: request.format,
                        section: request.section,
                        area: request.area,
                        baseName: request.baseName,
                        fileName: request.fileName,
                        base64: base64,
                        availableFormats: request.availableFormats,
                        autoFormatReason: request.autoFormatReason,
                    });
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _d.sent();
                    console.warn("[export] asset export failed:", request.fileName, error_2);
                    return [3 /*break*/, 7];
                case 7:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 8: return [3 /*break*/, 11];
                case 9:
                    e_2_1 = _d.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 11];
                case 10:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/, result];
            }
        });
    });
}
function computeSha256(bytes) {
    return __awaiter(this, void 0, void 0, function () {
        var buffer, digest, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    buffer = bytes instanceof Uint8Array
                        ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
                        : bytes;
                    return [4 /*yield*/, crypto.subtle.digest("SHA-256", buffer)];
                case 1:
                    digest = _a.sent();
                    return [2 /*return*/, bytesToHex(new Uint8Array(digest))];
                case 2:
                    error_3 = _a.sent();
                    console.warn("[export] unable to compute hash:", error_3);
                    return [2 /*return*/, ""];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(function (value) { return value.toString(16).padStart(2, "0"); })
        .join("");
}
function exportFramePreview(frame, layoutName) {
    return __awaiter(this, void 0, void 0, function () {
        var bytes, base64, hash, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, frame.exportAsync({
                            format: "PNG",
                            contentsOnly: true,
                            constraint: { type: "SCALE", value: 0.4 },
                        })];
                case 1:
                    bytes = _a.sent();
                    base64 = figma.base64Encode(bytes);
                    return [4 /*yield*/, computeSha256(bytes)];
                case 2:
                    hash = _a.sent();
                    return [2 /*return*/, {
                            id: "".concat(layoutName, "_preview"),
                            fileName: "".concat(layoutName, ".preview.png"),
                            format: "PNG",
                            base64: base64,
                            hash: hash,
                        }];
                case 3:
                    error_4 = _a.sent();
                    console.warn("[export] preview export failed:", error_4);
                    return [2 /*return*/, undefined];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function deriveAssetNaming(node, rootFrame) {
    var section = getSectionKey(node);
    var area = getAreaKey(node, rootFrame, section);
    var baseName = inferSemanticName(node.name);
    var key = "".concat(section, "__").concat(area, "__").concat(baseName);
    var nextIndex = (assetCounters.has(key) ? assetCounters.get(key) : 0) + 1;
    assetCounters.set(key, nextIndex);
    var suffix = nextIndex.toString().padStart(2, "0");
    return {
        section: section,
        area: area,
        baseName: baseName,
        index: nextIndex,
        fullName: "".concat(section, "_").concat(area, "_").concat(baseName, "_").concat(suffix),
    };
}
var assetCounters = new Map();
function getSectionKey(node) {
    if ("sectionId" in node && node.sectionId) {
        var sectionNode = figma.getNodeById(String(node.sectionId));
        if (sectionNode && sectionNode.type === "SECTION") {
            var slug = slugify(sectionNode.name ? sectionNode.name : "");
            if (slug) {
                return slug;
            }
        }
    }
    return "global";
}
function getAreaKey(node, rootFrame, sectionKey) {
    var current = node;
    var candidate = null;
    while (current) {
        var parent_1 = current.parent;
        if (!parent_1) {
            break;
        }
        if (parent_1.id === rootFrame.id || parent_1.type === "SECTION") {
            break;
        }
        if (parent_1.type === "FRAME" ||
            parent_1.type === "GROUP" ||
            parent_1.type === "COMPONENT" ||
            parent_1.type === "INSTANCE") {
            candidate = parent_1;
        }
        current = parent_1;
    }
    if (candidate) {
        var slug = slugify(candidate.name ? candidate.name : "");
        if (slug) {
            return slug;
        }
    }
    var fallback = slugify(String(typeof rootFrame.name !== "undefined" ? rootFrame.name : sectionKey));
    return fallback || sectionKey;
}
function inferSemanticName(name) {
    if (!name) {
        return "image";
    }
    var normalized = slugify(name.replace(/\d+/g, "").trim());
    return normalized || "image";
}
function rgbaToHex(color, opacity) {
    var r = Math.round(color.r * 255);
    var g = Math.round(color.g * 255);
    var b = Math.round(color.b * 255);
    var resolvedOpacity = typeof opacity !== "undefined" && opacity !== null ? opacity : 1;
    var a = Math.round(resolvedOpacity * 255);
    var hex = "#".concat(toHex(r)).concat(toHex(g)).concat(toHex(b));
    if (a === 255) {
        return hex;
    }
    return "".concat(hex).concat(toHex(a));
}
function toHex(value) {
    return value.toString(16).padStart(2, "0");
}
function clampNumber(value, min, max) {
    var safe = Number.isFinite(value) ? value : min;
    return Math.min(Math.max(safe, min), max);
}
function createIdFactory(prefix) {
    if (prefix === void 0) { prefix = "node"; }
    var used = new Set();
    return function (rawId, index) {
        if (rawId) {
            var slug = slugify(rawId);
            if (slug && !used.has(slug)) {
                used.add(slug);
                return slug;
            }
        }
        var suffix = index;
        var candidate = "";
        do {
            candidate = "".concat(prefix, "_").concat(suffix);
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
    var text = String(value);
    if (!text) {
        return "";
    }
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
function collectComments(frame, nodeIdSet) {
    return __awaiter(this, void 0, void 0, function () {
        var lookup, comments, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lookup = new Map();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, tryFetchComments(frame)];
                case 2:
                    comments = _a.sent();
                    comments.forEach(function (comment) {
                        var nodeId = comment && comment.client_meta ? comment.client_meta.node_id : undefined;
                        if (!nodeId || !nodeIdSet.has(nodeId)) {
                            return;
                        }
                        var userInfo = comment && comment.user ? comment.user : {};
                        var author = userInfo.handle ? userInfo.handle : (userInfo.name ? userInfo.name : "unknown");
                        var date = comment.created_at
                            ? comment.created_at.split("T")[0]
                            : "";
                        var message = comment && comment.message ? comment.message.trim() : "";
                        if (!message) {
                            return;
                        }
                        var formatted = date
                            ? "@".concat(author, " (").concat(date, ") ").concat(message)
                            : "@".concat(author, " ").concat(message);
                        var existing = lookup.has(nodeId) ? lookup.get(nodeId) : [];
                        existing.push(formatted);
                        lookup.set(nodeId, existing);
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    console.warn("[export] comment fetch skipped:", error_5);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, lookup];
            }
        });
    });
}
function tryFetchComments(frame) {
    return __awaiter(this, void 0, void 0, function () {
        var ids, comments, token, fileKey, response, data;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(typeof figma.getLocalCommentIdsAsync === "function" && typeof figma.getCommentByIdAsync === "function")) return [3 /*break*/, 3];
                    return [4 /*yield*/, figma.getLocalCommentIdsAsync()];
                case 1:
                    ids = _a.sent();
                    return [4 /*yield*/, Promise.all(ids.map(function (id) { return __awaiter(_this, void 0, void 0, function () {
                            var error_6;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, figma.getCommentByIdAsync(id)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                    case 2:
                                        error_6 = _a.sent();
                                        console.warn("[export] comment read failed:", id, error_6);
                                        return [2 /*return*/, undefined];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    comments = _a.sent();
                    return [2 /*return*/, comments.filter(Boolean)];
                case 3: return [4 /*yield*/, readCommentToken()];
                case 4:
                    token = _a.sent();
                    if (!token) {
                        return [2 /*return*/, []];
                    }
                    fileKey = figma.fileKey;
                    if (!fileKey) {
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, fetch("https://api.figma.com/v1/files/".concat(fileKey, "/comments"), {
                            method: "GET",
                            headers: {
                                "X-Figma-Token": token,
                                Accept: "application/json",
                            },
                        })];
                case 5:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Comments API error: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 6:
                    data = _a.sent();
                    return [2 /*return*/, data && Array.isArray(data.comments) ? data.comments : []];
            }
        });
    });
}
function readCommentToken() {
    return __awaiter(this, void 0, void 0, function () {
        var stored, _a, shared;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, figma.clientStorage.getAsync("codex.commentToken")];
                case 1:
                    stored = _b.sent();
                    if (typeof stored === "string" && stored.trim().length > 0) {
                        return [2 /*return*/, stored.trim()];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 3:
                    try {
                        shared = figma.root.getSharedPluginData("codex", "commentToken");
                        if (typeof shared === "string" && shared.trim().length > 0) {
                            return [2 /*return*/, shared.trim()];
                        }
                    }
                    catch (_c) {
                        // ignore
                    }
                    return [2 /*return*/, undefined];
            }
        });
    });
}
function summarizeComments(map) {
    var total = Array.from(map.values()).reduce(function (acc, items) { return acc + items.length; }, 0);
    return {
        nodeCount: map.size,
        total: total,
    };
}
function buildCssSnippet(node) {
    var decls = [];
    decls.push("width: ".concat(round(node.width), "px;"));
    decls.push("height: ".concat(round(node.height), "px;"));
    if ("cornerRadius" in node) {
        var corners_1 = [
            node.topLeftRadius,
            node.topRightRadius,
            node.bottomRightRadius,
            node.bottomLeftRadius,
        ].map(function (value) { return (typeof value === "number" ? "".concat(round(value), "px") : "0"); });
        if (corners_1.every(function (value) { return value === corners_1[0]; })) {
            decls.push("border-radius: ".concat(corners_1[0], ";"));
        }
        else {
            decls.push("border-radius: ".concat(corners_1.join(" "), ";"));
        }
    }
    var background = buildBackgroundCss(node);
    if (background) {
        decls.push("background: ".concat(background, ";"));
    }
    var stroke = extractStroke(node);
    if (stroke && stroke.color && stroke.weight) {
        decls.push("border: ".concat(round(stroke.weight), "px solid ").concat(stroke.color, ";"));
    }
    var shadows = buildShadowCss(node);
    if (shadows.length > 0) {
        decls.push("box-shadow: ".concat(shadows.join(", "), ";"));
    }
    if ("opacity" in node && typeof node.opacity === "number" && node.opacity < 1) {
        decls.push("opacity: ".concat(node.opacity.toFixed(2), ";"));
    }
    if ("effects" in node) {
        var blur_1 = node.effects.find(function (effect) { return effect.type === "LAYER_BLUR" && effect.visible !== false; });
        if (blur_1 && blur_1.type === "LAYER_BLUR") {
            decls.push("backdrop-filter: blur(".concat(round(blur_1.radius), "px);"));
        }
    }
    return decls.join("\n");
}
function buildBackgroundCss(node) {
    if (!("fills" in node)) {
        return undefined;
    }
    var fills = node.fills;
    if (!Array.isArray(fills) || fills.length === 0) {
        return undefined;
    }
    var visibleFills = fills.filter(function (fill) { return fill && fill.visible !== false; });
    if (visibleFills.length === 0) {
        return undefined;
    }
    var first = visibleFills[0];
    if (first.type === "SOLID") {
        return rgbaToHex(first.color, typeof first.opacity !== "undefined" && first.opacity !== null ? first.opacity : 1);
    }
    if (first.type === "GRADIENT_LINEAR" ||
        first.type === "GRADIENT_RADIAL" ||
        first.type === "GRADIENT_ANGULAR") {
        return gradientToCss(first);
    }
    return undefined;
}
function gradientToCss(fill) {
    if (!fill.gradientStops || fill.gradientStops.length === 0) {
        return undefined;
    }
    var stops = fill.gradientStops
        .map(function (stop) {
        var color = rgbaToHex(stop.color, typeof stop.color.a !== "undefined" && stop.color.a !== null ? stop.color.a : 1);
        var position = Math.round(stop.position * 100);
        return "".concat(color, " ").concat(position, "%");
    })
        .join(", ");
    if (fill.type === "GRADIENT_LINEAR" && fill.gradientTransform) {
        var angle = gradientAngle(fill.gradientTransform);
        return "linear-gradient(".concat(angle, "deg, ").concat(stops, ")");
    }
    if (fill.type === "GRADIENT_RADIAL") {
        return "radial-gradient(".concat(stops, ")");
    }
    if (fill.type === "GRADIENT_ANGULAR") {
        return "conic-gradient(".concat(stops, ")");
    }
    return undefined;
}
function gradientAngle(transform) {
    var _a = __read(transform[0], 2), x1 = _a[0], y1 = _a[1];
    var _b = __read(transform[1], 2), x2 = _b[0], y2 = _b[1];
    var angle = (Math.atan2(y1 - y2, x1 - x2) * 180) / Math.PI;
    return Math.round((angle + 360) % 360);
}
function buildShadowCss(node) {
    if (!("effects" in node)) {
        return [];
    }
    var effects = node.effects;
    if (!Array.isArray(effects)) {
        return [];
    }
    return effects
        .filter(function (effect) { return effect.visible !== false && effect.type === "DROP_SHADOW"; })
        .map(function (effect) {
        if (effect.type !== "DROP_SHADOW") {
            return undefined;
        }
        var color = rgbaToHex(effect.color, typeof effect.color.a !== "undefined" && effect.color.a !== null ? effect.color.a : 1);
        return "".concat(round(effect.offset.x), "px ").concat(round(effect.offset.y), "px ").concat(round(effect.radius), "px ").concat(round(effect.spread), "px ").concat(color);
    })
        .filter(Boolean);
}
function attachCssPreview(layoutObject, node) {
    return __awaiter(this, void 0, void 0, function () {
        var bytes, base64, hash, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, node.exportAsync({
                            format: "PNG",
                            constraint: { type: "SCALE", value: 0.25 },
                            useAbsoluteBounds: false,
                            contentsOnly: true,
                        })];
                case 1:
                    bytes = _a.sent();
                    base64 = figma.base64Encode(bytes);
                    return [4 /*yield*/, computeSha256(bytes)];
                case 2:
                    hash = _a.sent();
                    layoutObject.metadata = mergeMetadata(layoutObject.metadata, {
                        cssPreviewHash: hash,
                        cssPreviewBase64: base64,
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_7 = _a.sent();
                    console.warn("[export] css preview failed:", node.name, error_7);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function round(value) {
    return Math.round(Number(value) * 100) / 100;
}
