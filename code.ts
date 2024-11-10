async function initialize() {
  const stateKey = "MultiTextEditorState";
  const minSize = 200;

  const notifyErrorOptions = {
    error: true,
    timeout: 3000,
  };

  const state =
    (await figma.clientStorage.getAsync(stateKey)) ||
    ({
      height: 360,
      width: 360,
      dragStart: { x: 0, y: 0 },
      dragDelta: { x: 0, y: 0 },
      sortOrder: "y",
    } as State);

  const saveState = async () => {
    figma.clientStorage.setAsync(stateKey, state);
  };

  await saveState();

  figma.showUI(__html__, {
    themeColors: true,
    height: state.height,
    width: state.width,
  });

  figma.ui.postMessage({
    type: "updateSort",
    value: state.sortOrder,
  } as PluginMessageType);

  figma.ui.onmessage = async (pluginMessage: PluginMessageType) => {
    if (pluginMessage.type === "editText") {
      if (figma.currentPage.selection.length === 0) {
        figma.notify(
          "Select text elements to 'Update Text' 1",
          notifyErrorOptions
        );
        return;
      }

      if (!pluginMessage.value.trim()) {
        figma.notify(
          "Type text into the text editor to 'Update Text'",
          notifyErrorOptions
        );
        return;
      }

      const textAreaLines = pluginMessage.value
        .trim() //.trimEnd()
        .split("\n")
        .map((s) => s || " ") // empty line becomes empty text element, not skip...
        .reverse();

      // let noTextWasEdited = true;

      [...figma.currentPage.selection]
        .sort(sortNodesXYZ)
        .forEach(async (node) => {
          deleteNodeZIndexTree(node);
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
              // noTextWasEdited = false; // a text node was edited
            }
          }
        });

      /* if (noTextWasEdited) { 
        // doesn't work because forEach is async
        figma.notify("Select text elements to 'Update Text'", notifyErrorOptions);
        return;
      } */
    } else if (pluginMessage.type === "pullText") {
      let textAreaValue = "";

      if (figma.currentPage.selection.length === 0) {
        figma.notify("Select text elements to 'Pull Text' from", {
          error: true,
          timeout: 3000,
        });
        return;
      }

      [...figma.currentPage.selection]
        .sort(sortNodesXYZ) //
        .forEach((node) => {
          deleteNodeZIndexTree(node);
          if (node.type === "TEXT") {
            // || node.type === 'SHAPE_WITH_TEXT')
            textAreaValue += node.characters + "\n";
          }
        });
      textAreaValue = textAreaValue.trim();

      if (!textAreaValue) {
        figma.notify(
          "Select text elements to 'Pull Text' from",
          notifyErrorOptions
        );
        return;
      }

      figma.ui.postMessage({
        type: "pullText",
        value: textAreaValue.trim(),
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
        Math.max(state.width + state.dragDelta.x, minSize),
        Math.max(state.height + state.dragDelta.y, minSize)
      );
    } else if (pluginMessage.type === "endResizeWindow") {
      state.width = Math.max(state.width + state.dragDelta.x, minSize);
      state.height = Math.max(state.height + state.dragDelta.y, minSize);
      await saveState();
    } else if (pluginMessage.type === "updateSort") {
      state.sortOrder = pluginMessage.value;
      await saveState();
    }
  };

  const sortNodesXYZ: ArraySortSceneNode = (nodeA, nodeB) => {
    if (nodeA.absoluteBoundingBox == null) return 1;
    if (nodeB.absoluteBoundingBox == null) return -1;

    const { y: aY, x: aX } = nodeA.absoluteBoundingBox;
    const { y: bY, x: bX } = nodeB.absoluteBoundingBox;

    const x = aX - bX;
    const y = aY - bY;
    let z = 0;

    switch (state.sortOrder) {
      case "x":
        return x || y;
      case "y":
        return y || x;
      case "z":
        z = sortNodesZ(nodeA, nodeB);
        return z || y || x;
      // should never fallback to x or y, right?
      // how could 2 nodes ever have the same zIndexTree?
      default:
        return 0;
    }
  };

  const zIndexTreeKey = "zIndexTree";

  const deleteNodeZIndexTree = (node: SceneNode) => {
    node.setPluginData(zIndexTreeKey, "");
  };

  const getNodeZIndexTree = (node: SceneNode) => {
    let data = node.getPluginData(zIndexTreeKey);

    if (data === "") {
      data = setNodeZIndexTree(node);
    }

    return data.split(",").map((n) => parseInt(n));
  };

  /**
   * sets pluginData of "zIndexTree" for Layer Order z index sorting
   * - data is array of index position in parent, starting with node and moving up to root node
   * - ex: [nodeIndexInParent, parentIndexInGrandparent, ..., ancestorIndexInRootNode]
   */
  const setNodeZIndexTree = (node: SceneNode) => {
    let currentNode = node;
    const zIndexTree: number[] = [];
    while (currentNode.parent != null) {
      const index = currentNode.parent.children.indexOf(currentNode);
      zIndexTree.push(index);
      currentNode = currentNode.parent as SceneNode;
    }
    const value = zIndexTree.join(",");
    node.setPluginData(zIndexTreeKey, value);
    return value;
  };

  const sortNodesZ: ArraySortSceneNode = (nodeA, nodeB) => {
    let z = 0;

    let [zIA, zIB] = [nodeA, nodeB].map(getNodeZIndexTree);
    const minLength = Math.min(zIA.length, zIB.length);
    [zIA, zIB] = [zIA, zIB].map((node) => node.slice(-minLength));

    while (z === 0 && zIA.length > 0 && zIB.length > 0) {
      // zI.pop() is never undefined because length is checked in while()
      const zA = zIA.pop()!;
      const zB = zIB.pop()!;
      z = zA - zB;
    }

    return z;
  };

  type SortOrder = "x" | "y" | "z";

  type XY = { x: number; y: number };

  type PluginMessageType =
    | { type: "editText"; value: string }
    | { type: "pullText"; value: string }
    | { type: "updateSort"; value: SortOrder }
    | { type: "endResizeWindow"; xy: XY }
    | { type: "startResizeWindow"; xy: XY }
    | { type: "resizeWindow"; xy: XY };

  type ArraySort<T> = Exclude<Parameters<Array<T>["sort"]>[0], undefined>;
  type ArraySortSceneNode = ArraySort<SceneNode>;

  type State = {
    height: number;
    width: number;
    dragStart: XY;
    dragDelta: XY;
    sortOrder: SortOrder;
  };
}

initialize();
