# Flowstate — Interactive Task Board

Flowstate is an original, responsive Kanban Lite application, created for the LimeLightR Interactive Task Board internship assignment. It uses HTML5, CSS3, and plain JavaScript ES6+. No framework, build system, account, or server is needed.

## Features

- Create tasks with a title, description, category, priority, due date, and status.
- Edit tasks and delete them with a confirmation.
- Organise tasks in **To do**, **In progress**, and **Completed** columns.
- Move cards by **drag-and-drop** on desktop, or use each card's **stage dropdown** on mobile and keyboard.
- Search task titles, filter by category and priority, and sort by recency, priority, or due date.
- Distinct **coral high**, **amber medium**, and **green low** priority indicators.
- Live counts for all, active, completed, and upcoming due tasks, plus an overall completion ring.
- Light and dark themes, with theme preference saved across reloads.
- All tasks are automatically saved to browser `localStorage`, including edits, deletions, and status changes.
- Export saved tasks as a JSON backup.
- Confirmation before clearing the board.
- Responsive desktop, tablet, and mobile layout; accessible labels and keyboard-supported controls.

**First visit:** Six editable example tasks are provided to demonstrate functionality. They remain in localStorage until changed or deleted. Use “Clear board” to start from empty.

## Files

```text
index.html
styles.css
script.js
README.md
```

All four files belong **directly in the repository root** — not inside an extra folder.

## Run locally

Double-click `index.html` or use a local static server. No installation is necessary.

## GitHub Pages: follow the internship README

1. **Fork** the original repository: https://github.com/Lime-Light-TechLead/Interactive-Task-Board
2. Open your own fork, and replace its `index.html`, `styles.css`, and `script.js` with the files from this ZIP. Replace the starter README if desired, but **keep the original LICENSE** file in the fork.
3. Commit changes with clear messages such as `Create responsive task board layout`, `Add task management and persistence`, and `Polish dark mode and mobile experience` as you make changes (do not claim separate commits you have not made).
4. Open **Settings → Pages** and choose **Deploy from a branch**, **main**, **/(root)**, then save.
5. After deployment, open the Pages link and test creating, moving, editing, deleting, and refreshing tasks.
6. Email **both** your GitHub fork URL and live Pages URL to TechLead@limelightr.org.

For a fork named `Interactive-Task-Board` under account `mezeneasanga123`, the typical Pages URL would be `https://mezeneasanga123.github.io/Interactive-Task-Board/` once deployed. Always use the actual URL displayed under **Settings → Pages**.

## Implementation notes

- Storage key: `flowstate.tasks.v1`; theme key: `flowstate.theme.v1`.
- All user-entered text is HTML-escaped during task rendering.
- Persistent data is only on the current browser/device; GitHub Pages hosts the code, not individual users' tasks.
- Native drag-and-drop is enhanced with an accessible status dropdown because touch browsers do not consistently support HTML drag-and-drop.

## Original assignment

https://github.com/Lime-Light-TechLead/Interactive-Task-Board/blob/main/README.md

Deadline listed by the sender: **1 December 2026**.
