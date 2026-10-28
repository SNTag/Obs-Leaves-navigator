import { App, TFile } from "obsidian";
import { LeavesNavigatorSettings, parseFieldList, trimSlashes } from "./settings";

export interface RelatedLeaf {
	file: TFile;
	/** The current note links to it (body, embed, or frontmatter). */
	outgoing: boolean;
	/** It links to the current note. */
	incoming: boolean;
}

/**
 * Which leaves belong to which branch. Mirrors the branch base recipe:
 *
 *   file.path.startsWith("<leavesRoot>/" + branch.name)
 *   or (file.path.startsWith("<leavesRoot>") and (projects or related) contains branch)
 *
 * A leaf may belong to several branches. Built lazily in one pass over the
 * vault and thrown away whenever metadata changes.
 */
export class BranchIndex {
	private branches: TFile[] | null = null;
	private leavesByBranch = new Map<string, Set<string>>();
	private branchesByLeaf = new Map<string, Set<string>>();

	constructor(private app: App, private getSettings: () => LeavesNavigatorSettings) {}

	invalidate(): void {
		this.branches = null;
	}

	getBranches(): TFile[] {
		this.ensureBuilt();
		return this.branches ?? [];
	}

	isBranch(file: TFile): boolean {
		return this.getBranches().some((b) => b.path === file.path);
	}

	getLeaves(branch: TFile): TFile[] {
		this.ensureBuilt();
		return this.toFiles(this.leavesByBranch.get(branch.path));
	}

	isLeafOf(file: TFile, branch: TFile): boolean {
		this.ensureBuilt();
		return this.leavesByBranch.get(branch.path)?.has(file.path) ?? false;
	}

	/** Branches the note belongs to as a leaf. */
	branchesOf(file: TFile): TFile[] {
		this.ensureBuilt();
		return this.toFiles(this.branchesByLeaf.get(file.path));
	}

	/**
	 * Leaves of `branch` connected to `file` by any link: body links, embeds,
	 * frontmatter links (incl. the membership fields), and optionally backlinks.
	 */
	related(file: TFile, branch: TFile): RelatedLeaf[] {
		this.ensureBuilt();
		const members = this.leavesByBranch.get(branch.path);
		if (!members) return [];
		const found = new Map<string, RelatedLeaf>();
		const add = (path: string, dir: "outgoing" | "incoming") => {
			if (path === file.path || !members.has(path)) return;
			const target = this.app.vault.getAbstractFileByPath(path);
			if (!(target instanceof TFile)) return;
			const entry = found.get(path) ?? { file: target, outgoing: false, incoming: false };
			entry[dir] = true;
			found.set(path, entry);
		};

		const resolved = this.app.metadataCache.resolvedLinks;
		for (const target of Object.keys(resolved[file.path] ?? {})) add(target, "outgoing");
		// Belt and braces: resolve the membership fields ourselves too, in case
		// they hold plain names rather than links.
		for (const target of this.fieldTargets(file)) add(target.path, "outgoing");

		if (this.getSettings().includeBacklinks) {
			for (const [source, targets] of Object.entries(resolved)) {
				if (targets[file.path]) add(source, "incoming");
			}
		}

		return [...found.values()].sort((a, b) => a.file.basename.localeCompare(b.file.basename));
	}

	private ensureBuilt(): void {
		if (this.branches) return;
		const s = this.getSettings();
		const markdown = this.app.vault.getMarkdownFiles();

		const branches = markdown
			.filter((f) => this.looksLikeBranch(f, s))
			.sort((a, b) => a.basename.localeCompare(b.basename));
		const byName = new Map<string, TFile[]>();
		for (const b of branches) {
			const key = b.basename.toLowerCase();
			byName.set(key, [...(byName.get(key) ?? []), b]);
		}
		const branchPaths = new Set(branches.map((b) => b.path));

		this.leavesByBranch = new Map(branches.map((b) => [b.path, new Set<string>()]));
		this.branchesByLeaf = new Map();
		const link = (leaf: TFile, branch: TFile) => {
			if (leaf.path === branch.path) return;
			this.leavesByBranch.get(branch.path)?.add(leaf.path);
			const set = this.branchesByLeaf.get(leaf.path) ?? new Set<string>();
			set.add(branch.path);
			this.branchesByLeaf.set(leaf.path, set);
		};

		const root = trimSlashes(s.leavesRoot);
		const prefix = root ? root + "/" : "";
		for (const file of markdown) {
			if (!file.path.startsWith(prefix)) continue;

			// Folder rule: <leavesRoot>/<Branch>/... belongs to that branch.
			const rest = file.path.slice(prefix.length);
			const slash = rest.indexOf("/");
			if (slash > 0) {
				for (const b of byName.get(rest.slice(0, slash).toLowerCase()) ?? []) link(file, b);
			}

			// Field rule: projects / related point at the branch.
			for (const target of this.fieldTargets(file)) {
				if (branchPaths.has(target.path)) {
					const b = this.app.vault.getAbstractFileByPath(target.path);
					if (b instanceof TFile) link(file, b);
				}
			}
			for (const name of this.unresolvedFieldNames(file)) {
				for (const b of byName.get(name.toLowerCase()) ?? []) link(file, b);
			}
		}

		this.branches = branches;
	}

	private looksLikeBranch(file: TFile, s: LeavesNavigatorSettings): boolean {
		const folder = trimSlashes(s.branchFolder);
		if (folder && !file.path.startsWith(folder + "/")) return false;
		const prop = s.branchProperty.trim();
		if (!prop) return true;
		const value = this.app.metadataCache.getFileCache(file)?.frontmatter?.[prop];
		const wanted = s.branchValue.trim().toLowerCase();
		const values: unknown[] = Array.isArray(value) ? value : [value];
		return values.some((v) => typeof v === "string" && v.trim().toLowerCase() === wanted);
	}

	/** Raw string values of the membership fields. */
	private fieldValues(file: TFile): string[] {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) return [];
		const out: string[] = [];
		for (const field of parseFieldList(this.getSettings().membershipFields)) {
			const raw: unknown = fm[field];
			const values: unknown[] = Array.isArray(raw) ? raw : [raw];
			for (const v of values) if (typeof v === "string" && v.trim()) out.push(v);
		}
		return out;
	}

	private fieldTargets(file: TFile): TFile[] {
		const out: TFile[] = [];
		for (const value of this.fieldValues(file)) {
			const dest = this.app.metadataCache.getFirstLinkpathDest(linkpathOf(value), file.path);
			if (dest) out.push(dest);
		}
		return out;
	}

	/** Field values that don't resolve to a file: matched against branch names. */
	private unresolvedFieldNames(file: TFile): string[] {
		const out: string[] = [];
		for (const value of this.fieldValues(file)) {
			const linkpath = linkpathOf(value);
			if (this.app.metadataCache.getFirstLinkpathDest(linkpath, file.path)) continue;
			out.push(linkpath.split("/").pop() ?? linkpath);
		}
		return out;
	}

	private toFiles(paths: Set<string> | undefined): TFile[] {
		if (!paths) return [];
		const out: TFile[] = [];
		for (const p of paths) {
			const f = this.app.vault.getAbstractFileByPath(p);
			if (f instanceof TFile) out.push(f);
		}
		return out.sort((a, b) => a.basename.localeCompare(b.basename));
	}
}

/** `[[Path/Note#h|Alias]]`, `[Alias](Path/Note.md)` or `Note` → `Path/Note`. */
export function linkpathOf(value: string): string {
	let s = value.trim();
	const wiki = s.match(/^!?\[\[([^\]]+)\]\]$/);
	const md = s.match(/^!?\[[^\]]*\]\(([^)]+)\)$/);
	if (wiki) {
		s = wiki[1];
	} else if (md) {
		try {
			s = decodeURI(md[1]);
		} catch {
			s = md[1];
		}
	}
	s = s.split("|")[0].split("#")[0].trim();
	return s.replace(/\.md$/i, "");
}
