import { MarkdownView, Notice, Plugin, TAbstractFile, TFile, debounce } from "obsidian";
import { BranchIndex } from "./branchIndex";
import { BranchSuggestModal, RelatedLeafModal } from "./modals";
import { DEFAULT_SETTINGS, LeavesNavigatorSettings } from "./settings";
import { LeavesNavigatorSettingTab } from "./settingsTab";
import { LeavesNavigatorView, VIEW_TYPE_LEAVES_NAVIGATOR } from "./view";

export default class LeavesNavigatorPlugin extends Plugin {
	settings: LeavesNavigatorSettings = DEFAULT_SETTINGS;
	index!: BranchIndex;
	private history: string[] = [];
	private lastFile: TFile | null = null;
	private statusEl: HTMLElement | null = null;

	private refreshSoon = debounce(() => this.refresh(), 300, true);

	async onload(): Promise<void> {
		await this.loadSettings();
		this.index = new BranchIndex(this.app, () => this.settings);

		this.registerView(VIEW_TYPE_LEAVES_NAVIGATOR, (leaf) => new LeavesNavigatorView(leaf, this));
		this.addSettingTab(new LeavesNavigatorSettingTab(this.app, this));

		this.addRibbonIcon("shuffle", "Open random leaf in focused branch", () => void this.openRandomLeaf());
		this.addRibbonIcon("git-branch", "Open leaves navigator", () => void this.activateView());

		this.statusEl = this.addStatusBarItem();
		this.statusEl.addClass("mod-clickable", "leaves-nav-status");
		this.statusEl.setAttr("aria-label", "Change focused branch");
		this.statusEl.addEventListener("click", () => this.chooseBranch());

		this.addCommand({ id: "open-panel", name: "Open panel", callback: () => void this.activateView() });
		this.addCommand({ id: "choose-branch", name: "Choose focused branch", callback: () => this.chooseBranch() });
		this.addCommand({
			id: "focus-current-branch",
			name: "Focus on the current note's branch",
			callback: () => this.focusCurrentBranch(),
		});
		this.addCommand({ id: "open-random-leaf", name: "Open random leaf", callback: () => void this.openRandomLeaf() });
		this.addCommand({
			id: "open-random-related-leaf",
			name: "Open random related leaf",
			callback: () => void this.openRandomRelatedLeaf(),
		});
		this.addCommand({
			id: "choose-related-leaf",
			name: "Choose related leaf",
			callback: () => void this.chooseRelatedLeaf(),
		});
		this.addCommand({
			id: "open-branch-note",
			name: "Open focused branch note",
			callback: () => {
				const branch = this.getFocusedBranch();
				if (branch) void this.openFile(branch);
				else this.chooseBranch((b) => void this.openFile(b));
			},
		});

		const invalidate = () => {
			this.index.invalidate();
			this.refreshSoon();
		};
		this.registerEvent(this.app.metadataCache.on("resolved", invalidate));
		this.registerEvent(this.app.vault.on("create", invalidate));
		this.registerEvent(this.app.vault.on("delete", (file) => this.onDelete(file)));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => void this.onRename(file, oldPath)));
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file) this.lastFile = file;
				this.refreshSoon();
			}),
		);

		this.app.workspace.onLayoutReady(() => {
			this.lastFile = this.app.workspace.getActiveFile();
			this.refresh();
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.index?.invalidate();
		this.refreshSoon();
	}

	// ── State ────────────────────────────────────────────────────────────────

	getFocusedBranch(): TFile | null {
		const f = this.app.vault.getAbstractFileByPath(this.settings.focusedBranch);
		// Ignore a saved branch that no longer matches the branch settings.
		return f instanceof TFile && this.index.isBranch(f) ? f : null;
	}

	async setFocusedBranchPath(path: string): Promise<void> {
		this.settings.focusedBranch = path;
		this.history = [];
		await this.saveSettings();
		this.refresh();
	}

	/** The note the user is looking at, even when the panel has focus. */
	currentFile(): TFile | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view?.file) return view.file;
		if (this.lastFile && this.app.vault.getAbstractFileByPath(this.lastFile.path)) return this.lastFile;
		return null;
	}

	// ── Actions ──────────────────────────────────────────────────────────────

	chooseBranch(then?: (branch: TFile) => void): void {
		const branches = this.index.getBranches();
		if (!branches.length) {
			new Notice("Leaves navigator: no branch notes found. Check the plugin settings.");
			return;
		}
		new BranchSuggestModal(this.app, branches, async (b) => {
			await this.setFocusedBranchPath(b.path);
			new Notice(`Focused on ${b.basename}`);
			then?.(b);
		}).open();
	}

	focusCurrentBranch(): void {
		const file = this.currentFile();
		if (!file) {
			new Notice("Leaves navigator: no note open.");
			return;
		}
		if (this.index.isBranch(file)) {
			void this.setFocusedBranchPath(file.path).then(() => new Notice(`Focused on ${file.basename}`));
			return;
		}
		const branches = this.index.branchesOf(file);
		if (!branches.length) {
			new Notice(`Leaves navigator: ${file.basename} isn't a leaf of any branch.`);
		} else if (branches.length === 1) {
			void this.setFocusedBranchPath(branches[0].path).then(() =>
				new Notice(`Focused on ${branches[0].basename}`),
			);
		} else {
			new BranchSuggestModal(
				this.app,
				branches,
				(b) => void this.setFocusedBranchPath(b.path),
				`${file.basename} is in ${branches.length} branches. Focus on…`,
			).open();
		}
	}

	/** Runs `action` with the focused branch, asking for one first if none is set. */
	private withBranch(action: (branch: TFile) => void | Promise<void>): void {
		const branch = this.getFocusedBranch();
		if (branch) void action(branch);
		else this.chooseBranch((b) => void action(b));
	}

	async openRandomLeaf(): Promise<void> {
		this.withBranch(async (branch) => {
			const pick = this.pickRandom(this.index.getLeaves(branch));
			if (!pick) {
				new Notice(`Leaves navigator: no other leaves in ${branch.basename}.`);
				return;
			}
			await this.openFile(pick);
		});
	}

	async openRandomRelatedLeaf(): Promise<void> {
		this.withBranch(async (branch) => {
			const current = this.currentFile();
			const related = current ? this.index.related(current, branch) : [];
			const pick = this.pickRandom(related.map((r) => r.file));
			if (pick) {
				await this.openFile(pick);
			} else if (this.settings.relatedFallbackToRandom) {
				new Notice(`No related ${branch.basename} leaves here. Opening a random one.`);
				await this.openRandomLeaf();
			} else {
				new Notice(`Leaves navigator: no related ${branch.basename} leaves here.`);
			}
		});
	}

	async chooseRelatedLeaf(): Promise<void> {
		this.withBranch((branch) => {
			const current = this.currentFile();
			if (!current) {
				new Notice("Leaves navigator: no note open.");
				return;
			}
			const related = this.index.related(current, branch);
			if (!related.length) {
				new Notice(`Leaves navigator: no related ${branch.basename} leaves here.`);
				return;
			}
			new RelatedLeafModal(this.app, related, (r, newTab) => void this.openFile(r.file, newTab)).open();
		});
	}

	async openFile(file: TFile, newTab = this.settings.openInNewTab): Promise<void> {
		await this.app.workspace.getLeaf(newTab ? "tab" : false).openFile(file);
		this.lastFile = file;
		this.history = [file.path, ...this.history.filter((p) => p !== file.path)].slice(0, 50);
	}

	/** Random file other than the current note, avoiding recently opened ones when possible. */
	private pickRandom(files: TFile[]): TFile | null {
		const current = this.currentFile()?.path;
		const pool = files.filter((f) => f.path !== current);
		if (!pool.length) return null;
		const recent = new Set(this.history.slice(0, this.settings.recentHistorySize));
		const fresh = pool.filter((f) => !recent.has(f.path));
		const from = fresh.length ? fresh : pool;
		return from[Math.floor(Math.random() * from.length)];
	}

	// ── UI plumbing ──────────────────────────────────────────────────────────

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_LEAVES_NAVIGATOR)[0];
		if (!leaf) {
			const right = workspace.getRightLeaf(false);
			if (!right) return;
			await right.setViewState({ type: VIEW_TYPE_LEAVES_NAVIGATOR, active: true });
			leaf = right;
		}
		workspace.revealLeaf(leaf);
	}

	refresh(): void {
		const branch = this.getFocusedBranch();
		this.statusEl?.setText(branch ? `🌿 ${branch.basename}` : "🌿 No branch");
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_LEAVES_NAVIGATOR)) {
			if (leaf.view instanceof LeavesNavigatorView) leaf.view.render();
		}
	}

	private onDelete(file: TAbstractFile): void {
		if (this.lastFile?.path === file.path) this.lastFile = null;
		this.index.invalidate();
		this.refreshSoon();
	}

	private async onRename(file: TAbstractFile, oldPath: string): Promise<void> {
		this.history = this.history.map((p) => (p === oldPath ? file.path : p));
		if (this.settings.focusedBranch === oldPath) {
			this.settings.focusedBranch = file.path;
			await this.saveSettings();
		}
		this.index.invalidate();
		this.refreshSoon();
	}
}
