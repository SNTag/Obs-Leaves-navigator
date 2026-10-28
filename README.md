# Leaves Navigator

An Obsidian plugin for moving around a **branch** (a hub note such as `Atlas/Branches/Finance.md`) by jumping between its **leaves** (the notes that belong to it).

- **Focus a branch.** Pick one from the panel dropdown, the status bar (`🌿 Finance`), or a command.
- **Random leaf.** Opens a random note from the focused branch.
- **Random related leaf.** Opens a random leaf *of the same branch* that the current note is linked to, through any body link, embed, or frontmatter link (`related`, `projects`, …). Backlinks count too, unless you turn them off.
- **Choose related leaf.** The same set of leaves, in a fuzzy picker.

A leaf can belong to several branches. The panel shows the current note's other branches as "Also in: …" chips. Click one to switch focus.

## How your vault is read

### Branches

A **branch** is a note in `Atlas/Branches/` whose frontmatter has `Obs type: Branch`:

```yaml
---
title: Finance
Obs type: Branch
---
```

You can change both the folder and the property in settings. Leave either one empty to skip that check. The settings page shows how many branches the plugin found, which is a quick way to confirm the setup.

### Leaves

Each branch has a matching folder under `Atlas/Leaves/`, named after the branch note. With the default settings, a note is a leaf of `Accounting` if either of these holds:

1. **Folder rule:** it is inside `Atlas/Leaves/Accounting/`, at any depth.
2. **Field rule:** it is anywhere under `Atlas/Leaves/` (for example in another branch's folder) and its `projects` or `related` frontmatter points to the `Accounting` branch note. A link (`"[[Atlas/Branches/Accounting|Accounting]]"`) or the plain name (`Accounting`) both work.

This is the same logic as the branch base:

```yaml
filters:
  and:
    - or:
        - file.path.startsWith("Atlas/Leaves/" + this.file.name)
        - and:
            - file.path.startsWith("Atlas/Leaves")
            - or:
                - projects.contains(this.file.name)
                - related.contains(this.file.name)
```

The plugin is slightly stricter about the folder rule. It matches the folder `Atlas/Leaves/Accounting/` exactly, so `Atlas/Leaves/Accounting Extras/` is not counted as part of `Accounting`.

A note that satisfies these rules for several branches is a leaf of each of them.

### Related leaves

Given the current note and the focused branch, a related leaf is any leaf of that branch that:

- the current note links to: body links, embeds (`![[Discount rate#^024d8b]]`), and frontmatter links, or
- links to the current note (backlinks; can be turned off in settings).

The branch note itself and the current note are never offered. In the panel and the picker, `→` means the current note links to the leaf, `←` means the leaf links back, and `↔` means both.

## Using it

### Panel

Run **Open panel**, or click the branch ribbon icon. The panel opens in the right sidebar and shows:

- a dropdown to pick the focused branch, and a button to open the branch note
- the number of leaves in the branch
- **Random leaf** and **Random related** buttons
- the related leaves of the note you're on. Click one to open it; Ctrl/Cmd-click or middle-click opens it in a new tab.
- "Also in: …" chips for the current note's other branches

### Commands

| Command | What it does |
| --- | --- |
| Open panel | Opens the navigator in the right sidebar |
| Choose focused branch | Fuzzy-pick the branch to focus on |
| Focus on the current note's branch | Focuses the current note if it is a branch; otherwise its branch, asking if there are several |
| Open random leaf | Random leaf of the focused branch |
| Open random related leaf | Random leaf linked to or from the current note, within the focused branch |
| Choose related leaf | Pick from those related leaves |
| Open focused branch note | Jump back to the hub note |

Assign hotkeys in **Settings → Hotkeys** (search "Leaves Navigator"). The plugin sets no default hotkeys, following Obsidian's plugin guidelines.

Commands that need a branch open the branch picker first when none is focused.

### Random picks

- A random pick never returns the note you're on.
- It also skips the last few leaves you opened (10 by default) while other choices remain, so repeated presses keep finding new notes.
- If the current note has no related leaves in the branch, **Random related** opens a random leaf instead. You can turn this fallback off.

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| Branch folder | `Atlas/Branches` | Folder branch notes live in. Empty means anywhere. |
| Branch property | `Obs type` | Frontmatter property that marks a branch. Empty means no property check. |
| Branch property value | `Branch` | Value the property must have (not case-sensitive). |
| Leaves folder | `Atlas/Leaves` | Root of the leaves. `<folder>/<Branch>/` holds a branch's own leaves. |
| Membership fields | `projects, related` | Frontmatter fields that attach a leaf to other branches. |
| Count backlinks as related | on | Leaves linking *to* the current note count as related. |
| Fall back to a random leaf | on | "Random related" opens a random leaf when nothing is related. |
| Open in new tab | off | Open leaves in a new tab instead of the current one. |
| Avoid recent leaves | 10 | How many recently opened leaves random picks skip. |

## Install

### Manual

1. Download `main.js`, `manifest.json` and `styles.css`, either from the latest release or from this repository.
2. Copy them into `<vault>/.obsidian/plugins/leaves-navigator/`.
3. Reload Obsidian, then enable **Leaves Navigator** under **Settings → Community plugins**.

### BRAT

Add this repository in [BRAT](https://github.com/TfTHacker/obsidian42-brat).

## Future development

- **Branch leaves outside `Atlas/Leaves/`.** Notes elsewhere in the vault (for example `Efforts/…` or `Atlas/Clippings/…`) whose `projects` or `related` points to a branch could count as leaves of that branch. This would be an optional setting that applies the field rule to the whole vault, while the folder rule stays tied to `Atlas/Leaves/<Branch>/`. It is off for now so the plugin matches the branch base exactly.

## Develop

```bash
npm install
npm run build   # type-check + production bundle → main.js
npm run dev     # watch mode, rebuilds main.js on change
```

Source lives in `src/`:

| File | Role |
| --- | --- |
| `main.ts` | Plugin entry: commands, ribbon, status bar, random picking, opening files |
| `branchIndex.ts` | Finds branches, works out which leaves belong to them, and finds related leaves |
| `view.ts` | Sidebar panel |
| `modals.ts` | Branch and related-leaf pickers |
| `settings.ts`, `settingsTab.ts` | Settings and their UI |

To release, bump the version in `manifest.json`, `package.json` and `versions.json`, then push a matching tag (e.g. `0.1.1`). The release workflow builds the plugin and attaches `main.js`, `manifest.json` and `styles.css` to a GitHub release.

## License

[MPL-2.0](LICENSE)
