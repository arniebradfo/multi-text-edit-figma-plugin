# Multi Text Editor
***Edit multiple text elements in a single text editor***

Similar to [Multiple Text Editor](https://www.figma.com/community/plugin/1314354601837162016)'s "List to Layers" functionality. You might try this other plugin if you'd like to generate random content for text elements in a similar way.

## Functionality
- **Update Text** - each line of the text editor a selected text node in the selected 'Order'
  - An *empty line* fils the corresponding text node with an empty space.
  - Press `Cmd+Enter`/`Ctrl+Enter` while in the typing in the text editor to 'Update Text'
- **Pull Text** - fills the text editor with the content of the selected text elements, so you can edit existing text and update it. 
<!-- - **Select Text** - selects all the text element children of your current selection -->
- **Order** options:
  - **Left to Right (X)** - fills the *leftmost* text elements first. Falls back to 'Top to Bottom (Y)' if X values are equal.
  - **Top to Bottom (Y)** - fills the *topmost* text elements first. Falls back to 'Left to Right (X)' if Y values are equal.
  - **Layer order (Z)** - fills text elements in the order they appear in the Layers panel.

GitHub Repo: https://github.com/arniebradfo/multi-text-edit-figma-plugin

---

## TODOs
- Icon and Hero Image
- ctrl+enter to submit text
- Button: Select Text Node Children elements
- Button: help text
  - Write in Readme
  - Add HTML version
- persist state values

## BUGS
- Register undo? Figma should do this?
- Update text is one revision behind? Figma's fault?
