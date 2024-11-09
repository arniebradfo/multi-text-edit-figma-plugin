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

figma.showUI(__html__, {
  themeColors: true,
  height: state.height,
  width: state.width,
});

figma.ui.onmessage = async (pluginMessage: PluginMessageType) => {
  if (pluginMessage.type === "editText") {
    if (figma.currentPage.selection.length === 0) {
      figma.notify("Select text elements to Update Text");
      return;
    }

    const textAreaLines = pluginMessage.value
      .trim() //.trimEnd()
      .split("\n")
      .map((s) => s || " ") // empty line becomes empty text element, not skip...
      .reverse();

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
        deleteNodeZIndexTree(node);
        if (node.type === "TEXT") {
          // || node.type === 'SHAPE_WITH_TEXT')
          textAreaValue += node.characters + "\n";
        }
      });

    figma.ui.postMessage({
      type: "pullText",
      value: textAreaValue.trim() || debugTextAreaValue,
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
};

figma.ui.postMessage({
  type: "updateSort",
  value: state.sortOrder,
} as PluginMessageType);

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

  /* console.log({
    zIA: zIA.join(","),
    zIB: zIB.join(","),
    a: (nodeA as TextNode).characters,
    b: (nodeB as TextNode).characters,
    z,
  }); */

  return z;
};

const debugTextAreaValue = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
].join("\n");

type SortOrder = "x" | "y" | "z";

type XY = { x: number; y: number };

type PluginMessageType =
  | { type: "editText"; value: string }
  | { type: "pullText"; value: string }
  | { type: "updateSort"; value: SortOrder }
  | { type: "notify"; value: string }
  | { type: "endResizeWindow"; xy: XY }
  | { type: "startResizeWindow"; xy: XY }
  | { type: "resizeWindow"; xy: XY };

type ArraySort<T> = Exclude<Parameters<Array<T>["sort"]>[0], undefined>;
type ArraySortSceneNode = ArraySort<SceneNode>;
