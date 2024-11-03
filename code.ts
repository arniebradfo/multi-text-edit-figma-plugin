// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

const state: {
  height: number;
  width: number;
  dragStart: XY;
  dragDelta: XY;
  sortOrder: SortOrder;
} = {
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
figma.ui.onmessage = async (pluginMessage: PluginMessageType) => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (pluginMessage.type === "editText") {
    if (figma.currentPage.selection.length === 0) {
      figma.notify("Select text elements to Update Text");
      return;
    }

    const textAreaLines = pluginMessage.value.split("\n").reverse();
    
    [...figma.currentPage.selection]
      .map((node) => {
        let currentNode = node;
        const indexTree: number[] = [];
        while (currentNode.parent != null) {
          const index = currentNode.parent.children.indexOf(currentNode);
          indexTree.push(index);
          currentNode = currentNode.parent as SceneNode;
        }
        node.setPluginData("indexTree", indexTree.reverse().join(","));
        return node;
      })
      .sort(sortNodesXYZ)
      .forEach(async (node) => {
        if (node.type === "TEXT" && textAreaLines.length > 0) {
          const textAreaLine = textAreaLines.pop();
          if (textAreaLine) {
            await Promise.all(
              node
                .getRangeAllFontNames(0, node.characters.length)
                .map(figma.loadFontAsync)
            );
            // Setting this property requires the font the be loaded.
            node.characters = textAreaLine;
          }
        }
      });
  } else if (pluginMessage.type === "pullText") {
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
      value: textAreaValue || debugTextAreaValue,
    } as PluginMessageType);
  } else if (pluginMessage.type === "startResizeWindow") {
    state.dragStart = pluginMessage.xy;
  } else if (pluginMessage.type === "resizeWindow") {
    const { x, y } = pluginMessage.xy;
    state.dragDelta = {
      x: x - state.dragStart.x,
      y: y - state.dragStart.y,
    };
    figma.ui.resize(
      state.width + state.dragDelta.x,
      state.height + state.dragDelta.y
    );
  } else if (pluginMessage.type === "endResizeWindow") {
    state.width = state.width + state.dragDelta.x;
    state.height = state.height + state.dragDelta.y;
  } else if (pluginMessage.type === "updateSort") {
    state.sortOrder = pluginMessage.value;
  } else if (pluginMessage.type === "notify") {
    figma.notify(pluginMessage.value);
  }
  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};

figma.ui.postMessage({
  type: "updateSort",
  value: state.sortOrder,
} as PluginMessageType);

type SortOrder = "x" | "y" | "z";

type PluginMessageType =
  | { type: "editText"; value: string }
  | { type: "pullText"; value: string }
  | { type: "updateSort"; value: SortOrder }
  | { type: "notify"; value: string }
  | { type: "endResizeWindow"; xy: XY }
  | { type: "startResizeWindow"; xy: XY }
  | { type: "resizeWindow"; xy: XY };

const sortNodesXYZ: Parameters<Array<SceneNode>["sort"]>[0] = (
  nodeA,
  nodeB
) => {
  if (nodeA.absoluteBoundingBox == null) return 1;
  if (nodeB.absoluteBoundingBox == null) return -1;

  const { y: aY, x: aX } = nodeA.absoluteBoundingBox;
  const { y: bY, x: bX } = nodeB.absoluteBoundingBox;

  const x = aX - bX;
  const y = aY - bY;
  let z = 0;

  if (state.sortOrder === "z") {
    const [zIA, zIB] = [nodeA, nodeB].map((node) =>
      node
        .getPluginData("indexTree")
        .split(",")
        .map((n) => parseInt(n))
    );
    while (z === 0 && zIA.length > 0 && zIB.length > 0) {
      const zA = zIA.shift();
      const zB = zIB.shift();
      z = zA != null && zB != null ? zA - zB : -Infinity;
    }
    console.log({
      zIA: zIA.join(","),
      zIB: zIB.join(","),
      a: (nodeA as TextNode).characters,
      b: (nodeB as TextNode).characters,
      z,
    });
  }

  switch (state.sortOrder) {
    case "x":
      return x || y;
      break;
    case "y":
      return y || x;
      break;
    case "z":
      return z || y || x;
      break;
    default:
      return 0;
  }

  // return nodeA.y - nodeB.y || nodeA.x - nodeB.x;
};

type XY = { x: number; y: number };

const debugTextAreaValue = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
].join("\n");
