import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type LeavesNavigatorPlugin from "./main";
import { directionMark } from "./modals";

export const VIEW_TYPE_LEAVES_NAVIGATOR = "leaves-navigator-view";

export class LeavesNavigatorView extends ItemView {
	constructor(leaf: WorkspaceLeaf, private plugin: LeavesNavigatorPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_LEAVES_NAVIGATOR;
	}

	getDisplayText(): string {
		return "Leaves navigator";
	}

	getIcon(): string {
		return "git-branch";
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const { plugin } = this;
		const el = this.contentEl;
		el.empty();
		el.addClass("leaves-nav");

		const branch = plugin.getFocusedBranch();
		const branches = plugin.index.getBranches();

		// Branch picker
		const pickRow = el.createDiv({ cls: "leaves-nav-row" });
		const select = pickRow.createEl("select", { cls: "dropdown leaves-nav-select" });
		select.createEl("option", { text: "— Choose a branch —", value: "" });
		for (const b of branches) {
			const opt = select.createEl("option", { text: b.basename, value: b.path });
			if (branch && b.path === branch.path) opt.selected = true;
		}
		select.addEventListener("change", () => {
			void plugin.setFocusedBranchPath(select.value);
		});
		if (branch) {
			this.iconButton(pickRow, "file-symlink", "Open branch note", (evt) =>
				void plugin.openFile(branch, isNewTab(evt)),
			);
		}

		if (!branch) {
			el.createDiv({
				cls: "leaves-nav-empty",
				text: branches.length
					? "Pick a branch to focus on."
					: "No branch notes found. Check the plugin settings.",
			});
			return;
		}

		const leaves = plugin.index.getLeaves(branch);
		el.createDiv({ cls: "leaves-nav-meta", text: `${leaves.length} leaves in ${branch.basename}` });

		// Actions
		const actions = el.createDiv({ cls: "leaves-nav-actions" });
		this.textButton(actions, "shuffle", "Random leaf", () => void plugin.openRandomLeaf());
		this.textButton(actions, "dices", "Random related", () => void plugin.openRandomRelatedLeaf());

		// Current note
		const current = plugin.currentFile();
		if (!current) return;

		const section = el.createDiv({ cls: "leaves-nav-section" });
		const heading = section.createDiv({ cls: "leaves-nav-heading" });
		heading.createSpan({ text: "Related to " });
		heading.createEl("strong", { text: current.basename });

		const others = plugin.index.branchesOf(current).filter((b) => b.path !== branch.path);
		if (others.length) {
			const also = section.createDiv({ cls: "leaves-nav-also" });
			also.createSpan({ text: "Also in: " });
			for (const b of others) {
				const chip = also.createEl("a", { cls: "leaves-nav-chip", text: b.basename });
				chip.setAttr("aria-label", `Focus on ${b.basename}`);
				chip.addEventListener("click", () => void plugin.setFocusedBranchPath(b.path));
			}
		}

		const related = plugin.index.related(current, branch);
		if (!related.length) {
			section.createDiv({
				cls: "leaves-nav-empty",
				text: `No links to other ${branch.basename} leaves.`,
			});
			return;
		}
		const list = section.createEl("ul", { cls: "leaves-nav-list" });
		for (const item of related) {
			const li = list.createEl("li", { cls: "leaves-nav-item" });
			li.createSpan({ cls: "leaves-nav-direction", text: directionMark(item) });
			const a = li.createEl("a", { cls: "leaves-nav-link", text: item.file.basename });
			a.addEventListener("click", (evt) => void plugin.openFile(item.file, isNewTab(evt)));
			a.addEventListener("auxclick", (evt) => {
				if (evt.button === 1) void plugin.openFile(item.file, true);
			});
		}
	}

	private iconButton(parent: HTMLElement, icon: string, label: string, onClick: (evt: MouseEvent) => void): void {
		const btn = parent.createEl("button", { cls: "clickable-icon leaves-nav-icon-btn" });
		setIcon(btn, icon);
		btn.setAttr("aria-label", label);
		btn.addEventListener("click", onClick);
	}

	private textButton(parent: HTMLElement, icon: string, label: string, onClick: () => void): void {
		const btn = parent.createEl("button", { cls: "leaves-nav-btn" });
		setIcon(btn.createSpan({ cls: "leaves-nav-btn-icon" }), icon);
		btn.createSpan({ text: label });
		btn.addEventListener("click", onClick);
	}
}

function isNewTab(evt: MouseEvent): boolean {
	return evt.ctrlKey || evt.metaKey;
}
