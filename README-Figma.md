**Edit multiple text elements in a single text editor**

Very helpful for bulk text editing, or ask an LLM for a list of dummy content to paste into the text editor.

**Docs**
- **Update Text** - each line of the text editor a selected text node in the selected 'Order'
  - An *empty line* fils the corresponding text node with an empty space.
  - Press `Cmd+Enter`/`Ctrl+Enter` while in the typing in the text editor to 'Update Text'
- **Pull Text** - fills the text editor with the content of the selected text elements, so you can edit existing text and update it. 
<!-- - **Select Text** - selects all the text element children of your current selection -->
- **Order** options:
  - **Left to Right (X)** - fills the *leftmost* text elements first. Falls back to 'Top to Bottom (Y)' if X values are equal.
  - **Top to Bottom (Y)** - fills the *topmost* text elements first. Falls back to 'Left to Right (X)' if Y values are equal.
  - **Layer order (Z)** - fills text elements in the order they appear in the Layers panel.
- Tip: Precisely select nested text elements using "Ctrl+Click Drag" to draw a box through a set of text elements. See [Figma Docs](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects#:~:text=To%20select%20nested%20layers) "Selection Marquee 4." for details.

Similar to [Multiple Text Editor](https://www.figma.com/community/plugin/1314354601837162016)'s "List to Layers" functionality, but with more sorting options. You might try this other plugin if you'd like to generate random content for text elements in a similar way.

[Github Repo](https://github.com/arniebradfo/multi-text-edit-figma-plugin)