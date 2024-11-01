"use strict";
// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).
const state = {
    height: 360,
    width: 360,
    dragStart: { x: 0, y: 0 },
    dragDelta: { x: 0, y: 0 },
    sortOrder: "y",
};
// TODO: persist and restore state?
// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
    themeColors: true,
    height: state.height,
    width: state.width,
});
// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (pluginMessage) => __awaiter(void 0, void 0, void 0, function* () {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    if (pluginMessage.type === "editText") {
        if (figma.currentPage.selection.length === 0) {
            figma.notify("Select text elements to Update Text");
            return;
        }
        const textAreaLines = pluginMessage.value.split("\n").reverse();
        [...figma.currentPage.selection]
            .sort(sortNodesXYZ)
            .forEach((node) => __awaiter(void 0, void 0, void 0, function* () {
            if (node.type === "TEXT" && textAreaLines.length > 0) {
                const textAreaLine = textAreaLines.pop();
                if (textAreaLine) {
                    yield Promise.all(node
                        .getRangeAllFontNames(0, node.characters.length)
                        .map(figma.loadFontAsync));
                    // Setting this property requires the font the be loaded.
                    node.characters = textAreaLine;
                }
            }
        }));
    }
    else if (pluginMessage.type === "pullText") {
        let textAreaValue = "";
        if (figma.currentPage.selection.length === 0) {
            figma.notify("Select text elements to Pull Text from");
            return;
        }
        [...figma.currentPage.selection]
            .sort(sortNodesXYZ) //
            .forEach((node) => {
            if (node.type === "TEXT") {
                // || node.type === 'SHAPE_WITH_TEXT') {
                textAreaValue += node.characters + "\n";
            }
        });
        figma.ui.postMessage({
            type: "pullText",
            value: textAreaValue,
        });
    }
    else if (pluginMessage.type === "startResizeWindow") {
        state.dragStart = pluginMessage.xy;
    }
    else if (pluginMessage.type === "resizeWindow") {
        const { x, y } = pluginMessage.xy;
        state.dragDelta = {
            x: x - state.dragStart.x,
            y: y - state.dragStart.y,
        };
        figma.ui.resize(state.width + state.dragDelta.x, state.height + state.dragDelta.y);
    }
    else if (pluginMessage.type === "endResizeWindow") {
        state.width = state.width + state.dragDelta.x;
        state.height = state.height + state.dragDelta.y;
    }
    else if (pluginMessage.type === "updateSort") {
        state.sortOrder = pluginMessage.value;
    }
    else if (pluginMessage.type === "notify") {
        figma.notify(pluginMessage.value);
    }
    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    // figma.closePlugin();
});
figma.ui.postMessage({
    type: "updateSort",
    value: state.sortOrder,
});
const sortNodesXYZ = (nodeA, nodeB) => {
    if (nodeA.absoluteBoundingBox == null)
        return 1;
    if (nodeB.absoluteBoundingBox == null)
        return -1;
    const { y: aY, x: aX } = nodeA.absoluteBoundingBox;
    const { y: bY, x: bX } = nodeB.absoluteBoundingBox;
    const aZ = 0;
    const bZ = 0;
    const x = aX - bX;
    const y = aY - bY;
    const z = aZ - bZ;
    switch (state.sortOrder) {
        case "x":
            return z || y || x;
            break;
        case "y":
            return z || x || y;
            break;
        case "z":
            return x || y || z;
            break;
        default:
            return 0;
    }
    // return nodeA.y - nodeB.y || nodeA.x - nodeB.x;
};
