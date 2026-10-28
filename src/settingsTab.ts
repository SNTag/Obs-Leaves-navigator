import { App, PluginSettingTab, Setting } from "obsidian";
import type LeavesNavigatorPlugin from "./main";

export class LeavesNavigatorSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: LeavesNavigatorPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;

		const text = (name: string, desc: string, key: "leavesRoot" | "branchFolder" | "branchProperty" | "branchValue" | "membershipFields") =>
			new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((t) =>
					t.setValue(s[key]).onChange(async (v) => {
						s[key] = v;
						await this.plugin.saveSettings();
						this.updateCount();
					}),
				);

		new Setting(containerEl).setName("Branches").setHeading();
		text("Branch folder", "Folder branch notes live in. Leave empty to look everywhere.", "branchFolder");
		text("Branch property", "Frontmatter property that marks a branch. Leave empty to skip this check.", "branchProperty");
		text("Branch property value", "Value the property must have (not case-sensitive).", "branchValue");
		this.countEl = containerEl.createDiv({ cls: "setting-item-description leaves-nav-count" });
		this.updateCount();

		new Setting(containerEl).setName("Leaves").setHeading();
		text(
			"Leaves folder",
			"Leaves live under this folder. A note in <folder>/<Branch>/ belongs to that branch; any other note here belongs to every branch its membership fields point to.",
			"leavesRoot",
		);
		text("Membership fields", "Comma-separated frontmatter fields that link a leaf to its branches.", "membershipFields");

		new Setting(containerEl).setName("Navigation").setHeading();
		new Setting(containerEl)
			.setName("Count backlinks as related")
			.setDesc("Leaves that link to the current note count as related, as well as the leaves it links to.")
			.addToggle((t) =>
				t.setValue(s.includeBacklinks).onChange(async (v) => {
					s.includeBacklinks = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName("Fall back to a random leaf")
			.setDesc("When the current note has no related leaves in the branch, \"Random related\" opens a random leaf instead.")
			.addToggle((t) =>
				t.setValue(s.relatedFallbackToRandom).onChange(async (v) => {
					s.relatedFallbackToRandom = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName("Open in new tab")
			.setDesc("Ctrl/Cmd-click in the panel always opens a new tab.")
			.addToggle((t) =>
				t.setValue(s.openInNewTab).onChange(async (v) => {
					s.openInNewTab = v;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName("Avoid recent leaves")
			.setDesc("Random picks skip this many recently opened leaves while there are other choices.")
			.addSlider((sl) =>
				sl
					.setLimits(0, 50, 1)
					.setValue(s.recentHistorySize)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.recentHistorySize = v;
						await this.plugin.saveSettings();
					}),
			);
	}

	private countEl: HTMLElement | null = null;

	private updateCount(): void {
		if (!this.countEl) return;
		const branches = this.plugin.index.getBranches();
		const names = branches.slice(0, 8).map((b) => b.basename).join(", ");
		this.countEl.setText(
			`Found ${branches.length} branch${branches.length === 1 ? "" : "es"}` +
				(branches.length ? `: ${names}${branches.length > 8 ? ", …" : ""}` : "."),
		);
	}
}
