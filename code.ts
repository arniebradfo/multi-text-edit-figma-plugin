// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

const state: {
  height: number;
  width: number;
  dragX: number;
  dragY: number;
  sortOrder: SortOrder;
} = {
  height: 360,
  width: 360,
  dragX: 0,
  dragY: 0,
  sortOrder: "y",
};

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
    const textAreaLines = pluginMessage.value.split("\n").reverse();
    [...figma.currentPage.selection]
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
    } as PluginMessageType);
  } else if (pluginMessage.type === "resizeWindow") {

    const { x, y } = pluginMessage.dimensions;
    state.dragX = x;
    state.dragY = y;
    figma.ui.resize(state.width + state.dragX, state.height + state.dragY);
  } else if (pluginMessage.type === "endResizeWindow") {
    state.width = state.width + state.dragX;
    state.height = state.height + state.dragY;
  } else if (pluginMessage.type === "updateSort") {
    state.sortOrder = pluginMessage.value;
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
  | { type: "endResizeWindow" }
  | { type: "resizeWindow"; dimensions: { x: number; y: number } };

const sortNodesXYZ: Parameters<Array<SceneNode>["sort"]>[0] = (
  nodeA,
  nodeB
) => {
  if (nodeA.absoluteBoundingBox == null) return 1;
  if (nodeB.absoluteBoundingBox == null) return -1;

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
