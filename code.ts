// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

const state = {
  height: 360,
  width: 220,
  dragX: 0,
  dragY: 0,
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
    console.log(pluginMessage.value);

    const textAreaLines = pluginMessage.value.split("\n").reverse();

    [...figma.currentPage.selection]
      .sort((nodeA, nodeB) => {
        if (nodeA.absoluteBoundingBox == null) return 1;
        if (nodeB.absoluteBoundingBox == null) return -1;
        const { y: aY, x: aX } = nodeA.absoluteBoundingBox;
        const { y: bY, x: bX } = nodeB.absoluteBoundingBox;
        return aY - bY || aX - bX;
        // return nodeA.y - nodeB.y || nodeA.x - nodeB.x;
      })
      .forEach(async (node) => {
        if (node.type === "TEXT" && textAreaLines.length > 0) {
          const textAreaLine = textAreaLines.pop();
          console.log({
            x: node.absoluteBoundingBox?.x,
            y: node.absoluteBoundingBox?.y,
            text: node.characters,
            textAreaLine
          });

          if (textAreaLine) {
            await Promise.all(
              node
                .getRangeAllFontNames(0, node.characters.length)
                .map(figma.loadFontAsync)
            );
            // node.deleteCharacters(0, node.characters.length - 1)
            // node.insertCharacters(0, textAreaLine)

            // Setting this property requires the font the be loaded.
            node.characters = textAreaLine;
          }
        }
      });
  } else if (pluginMessage.type === "pullText") {
    console.log(figma.currentPage.selection);
    let textAreaValue = "";
    figma.currentPage.selection.forEach((node) => {
      if (node.type === "TEXT") {
        // || node.type === 'SHAPE_WITH_TEXT') {
        textAreaValue += node.characters + "\n";
      }
    });
    figma.ui.postMessage(textAreaValue);
  } else if (pluginMessage.type === "resizeWindow") {
    console.log(pluginMessage.dimensions, state);

    const { x, y } = pluginMessage.dimensions;
    state.dragX = x;
    state.dragY = y;
    figma.ui.resize(state.width + state.dragX, state.height + state.dragY);
  } else if (pluginMessage.type === "endResizeWindow") {
    state.width = state.width + state.dragX;
    state.height = state.height + state.dragY;
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};

type PluginMessageType =
  | { type: "editText"; value: string }
  | { type: "pullText" }
  | { type: "endResizeWindow" }
  | { type: "resizeWindow"; dimensions: { x: number; y: number } };
