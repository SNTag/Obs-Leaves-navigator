export interface LeavesNavigatorSettings {
	/** Folder that holds all leaves (the base's `Atlas/Leaves`). Empty = whole vault. */
	leavesRoot: string;
	/** Folder branch notes live in. Empty = anywhere. */
	branchFolder: string;
	/** Frontmatter property that marks a branch note. Empty = no property check. */
	branchProperty: string;
	/** Value `branchProperty` must have (case-insensitive). */
	branchValue: string;
	/** Comma-separated frontmatter fields whose links attach a leaf to a branch. */
	membershipFields: string;
	/** Count notes that link *to* the current note as related, not just ones it links to. */
	includeBacklinks: boolean;
	/** When the current note has no related leaves in the branch, open a random leaf instead. */
	relatedFallbackToRandom: boolean;
	openInNewTab: boolean;
	/** How many recently opened leaves random picks try to avoid. */
	recentHistorySize: number;
	/** Path of the focused branch note. */
	focusedBranch: string;
}

export const DEFAULT_SETTINGS: LeavesNavigatorSettings = {
	leavesRoot: "Atlas/Leaves",
	branchFolder: "Atlas/Branches",
	branchProperty: "Obs type",
	branchValue: "Branch",
	membershipFields: "projects, related",
	includeBacklinks: true,
	relatedFallbackToRandom: true,
	openInNewTab: false,
	recentHistorySize: 10,
	focusedBranch: "",
};

export function trimSlashes(path: string): string {
	return path.trim().replace(/^\/+|\/+$/g, "");
}

export function parseFieldList(raw: string): string[] {
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}
