# Leaves Navigator

An Obsidian plugin for moving around a **branch** (a hub note such as `Atlas/Branches/Finance.md`) by jumping between its **leaves** (the notes that belong to it).

- **Focus a branch.** Pick one from the panel dropdown, the status bar (`🌿 Finance`), or a command.
- **Random leaf.** Opens a random note from the focused branch.
- **Random related leaf.** Opens a random leaf *of the same branch* that the current note is linked to, through any body link, embed, or frontmatter link (`related`, `projects`, …). Backlinks count too, unless you turn them off.
- **Choose related leaf.** The same set of leaves, in a fuzzy picker.

A leaf can belong to several branches. The panel shows the current note's other branches as "Also in: …" chips. Click one to switch focus.

## What counts as a leaf of a branch

This follows the branch base recipe. With the default settings, a note is a leaf of branch `Finance` if either of these holds:

1. It is inside `Atlas/Leaves/Finance/` (any depth).
2. It is anywhere under `Atlas/Leaves/` and its `projects` or `related` frontmatter links to the `Finance` branch note (or names it as plain text).

A **branch** is a note in `Atlas/Branches/` whose `Obs type` is `Branch`. You can change the folders, the property and the membership fields in settings. Settings also shows how many branches the plugin found.

## Commands

| Command | What it does |
| --- | --- |
| Open panel | Opens the navigator in the right sidebar |
| Choose focused branch | Fuzzy-pick the branch to focus on |
| Focus on the current note's branch | Focuses the current note if it is a branch; otherwise its branch, asking if there are several |
| Open random leaf | Random leaf of the focused branch |
| Open random related leaf | Random leaf linked to or from the current note, within the focused branch |
| Choose related leaf | Pick from those related leaves |
| Open focused branch note | Jump back to the hub note |

Assign hotkeys in **Settings → Hotkeys** (search "Leaves Navigator"). The plugin sets no default hotkeys.

Random picks never return the note you are on. They also skip the last few leaves you opened (10 by default) while other choices remain, so repeated presses don't keep showing the same notes.

## Install (manual)

Copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/leaves-navigator/`, then enable **Leaves Navigator** under Community plugins.

## Develop

```bash
npm install
npm run build   # type-check + production bundle → main.js
npm run dev     # watch mode
```
