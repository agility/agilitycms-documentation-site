/*
  Code tabs for CMS-authored articles.

  Authors write plain Markdown — a wrapper div whose `data-tabs` lists the
  labels, with one fenced code block per label (blank lines around them so
  CommonMark still parses the fences):

      <div class="code-tabs" data-tabs="JavaScript,.NET">

      ```ts
      await client.saveContentItem(...)
      ```

      ```csharp
      await client.SaveContentItem(...);
      ```

      </div>

  This upgrades that markup into a real tablist at runtime. Because the code
  blocks stay ordinary fenced blocks, highlight.js highlights them exactly as
  it does anywhere else, and if JS never runs the reader still sees every
  snippet (stacked) rather than an empty panel.

  Language choice is sticky: picking ".NET" switches every group on the page and
  is remembered across articles (namespaced localStorage key), which is the
  point of tabs in a multi-language SDK section.
*/

const STORAGE_KEY = "aglty-docs-code-tab";
const ENHANCED = "data-code-tabs-ready";

/** Unique-enough ids for aria wiring without touching Math.random(). */
let groupSeq = 0;

const readPreferred = (): string | null => {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
};

const writePreferred = (label: string) => {
	try {
		localStorage.setItem(STORAGE_KEY, label);
	} catch {
		/* private mode — tabs still work, just not sticky */
	}
};

interface Group {
	root: HTMLElement;
	tabs: HTMLButtonElement[];
	panels: HTMLElement[];
	labels: string[];
}

const selectIn = (group: Group, index: number) => {
	group.tabs.forEach((tab, i) => {
		const active = i === index;
		tab.setAttribute("aria-selected", active ? "true" : "false");
		tab.tabIndex = active ? 0 : -1;
		tab.dataset.active = active ? "true" : "false";
	});
	group.panels.forEach((panel, i) => {
		panel.hidden = i !== index;
	});
};

/**
 * Upgrade every `.code-tabs` block under `root`. Safe to call repeatedly — an
 * already-upgraded group is skipped.
 */
export const enhanceCodeTabs = (root: HTMLElement) => {
	const blocks = Array.from(
		root.querySelectorAll<HTMLElement>(".code-tabs:not([" + ENHANCED + "])")
	);
	if (blocks.length === 0) return;

	const groups: Group[] = [];

	for (const block of blocks) {
		const labels = (block.dataset.tabs || "")
			.split(",")
			.map((l) => l.trim())
			.filter(Boolean);
		// Only the <pre> blocks that are direct children — a nested pre (inside a
		// blockquote, say) isn't a panel.
		const panels = Array.from(block.children).filter(
			(el): el is HTMLElement => el.tagName === "PRE"
		);

		// Mismatched authoring (or no labels) → leave the snippets stacked and
		// readable instead of building a broken tablist.
		if (labels.length < 2 || labels.length !== panels.length) {
			block.setAttribute(ENHANCED, "skipped");
			continue;
		}

		const id = `code-tabs-${++groupSeq}`;
		const bar = document.createElement("div");
		bar.className = "code-tabs__bar";
		bar.setAttribute("role", "tablist");

		const tabs = labels.map((label, i) => {
			const tab = document.createElement("button");
			tab.type = "button";
			tab.className = "code-tabs__tab";
			tab.textContent = label;
			tab.setAttribute("role", "tab");
			tab.id = `${id}-tab-${i}`;
			tab.setAttribute("aria-controls", `${id}-panel-${i}`);
			bar.appendChild(tab);
			return tab;
		});

		panels.forEach((panel, i) => {
			panel.id = `${id}-panel-${i}`;
			panel.setAttribute("role", "tabpanel");
			panel.setAttribute("aria-labelledby", `${id}-tab-${i}`);
			panel.classList.add("code-tabs__panel");
		});

		block.insertBefore(bar, block.firstChild);
		block.setAttribute(ENHANCED, "true");

		const group: Group = { root: block, tabs, panels, labels };
		groups.push(group);

		tabs.forEach((tab, i) => {
			tab.addEventListener("click", () => {
				writePreferred(labels[i]);
				// Switch every group that offers this language, so one click sets
				// the language for the whole article.
				groups.forEach((g) => {
					const match = g.labels.indexOf(labels[i]);
					selectIn(g, match >= 0 ? match : 0);
				});
			});

			tab.addEventListener("keydown", (event) => {
				const key = (event as KeyboardEvent).key;
				let next = -1;
				if (key === "ArrowRight") next = (i + 1) % tabs.length;
				else if (key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
				else if (key === "Home") next = 0;
				else if (key === "End") next = tabs.length - 1;
				if (next < 0) return;
				event.preventDefault();
				tabs[next].click();
				tabs[next].focus();
			});
		});
	}

	// Initial selection: the reader's remembered language when this group offers
	// it, otherwise the first tab.
	const preferred = readPreferred();
	groups.forEach((group) => {
		const index = preferred ? group.labels.indexOf(preferred) : -1;
		selectIn(group, index >= 0 ? index : 0);
	});
};
