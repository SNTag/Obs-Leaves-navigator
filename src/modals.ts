import { App, FuzzyMatch, FuzzySuggestModal, TFile } from "obsidian";
import { RelatedLeaf } from "./branchIndex";

export class BranchSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private branches: TFile[],
		private onChoose: (branch: TFile) => void,
		placeholder = "Focus on branch…",
	) {
		super(app);
		this.setPlaceholder(placeholder);
	}

	getItems(): TFile[] {
		return this.branches;
	}

	getItemText(item: TFile): string {
		return item.basename;
	}

	onChooseItem(item: TFile): void {
		this.onChoose(item);
	}
}

export class RelatedLeafModal extends FuzzySuggestModal<RelatedLeaf> {
	constructor(
		app: App,
		private items: RelatedLeaf[],
		private onChoose: (leaf: RelatedLeaf, newTab: boolean) => void,
	) {
		super(app);
		this.setPlaceholder("Open related leaf…");
		this.setInstructions([
			{ command: "↵", purpose: "open" },
			{ command: "→", purpose: "this note links to it" },
			{ command: "←", purpose: "it links here" },
		]);
	}

	getItems(): RelatedLeaf[] {
		return this.items;
	}

	getItemText(item: RelatedLeaf): string {
		return item.file.basename;
	}

	renderSuggestion(match: FuzzyMatch<RelatedLeaf>, el: HTMLElement): void {
		super.renderSuggestion(match, el);
		el.createSpan({ cls: "leaves-nav-direction", text: " " + directionMark(match.item) });
	}

	onChooseItem(item: RelatedLeaf, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(item, evt.ctrlKey || evt.metaKey);
	}
}

export function directionMark(leaf: RelatedLeaf): string {
	if (leaf.outgoing && leaf.incoming) return "↔";
	return leaf.outgoing ? "→" : "←";
}
