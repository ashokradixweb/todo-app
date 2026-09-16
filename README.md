# Todo App

Standalone local Todo app for Windows with a vanilla frontend and TypeScript/Express backend.

## Features

- Create, edit and delete tasks
- Complete/reopen tasks
- Priority: low / medium / high
- Due dates
- Notes
- Tags
- Search
- Filters: all / active / today / overdue / completed
- Sorting by update time, creation time, due date, priority or title
- Multi-select tasks
- Bulk mark complete
- Bulk delete
- Clear completed
- Overview stats
- Keyboard shortcuts: `N`, `/`, `Esc`
- Local JSON persistence
- Flat grayscale responsive UI
- No React/Vue/Svelte/Tailwind/UI framework

## Run on Windows

```powershell
npm install
npm run dev
```

Open:

`http://localhost:3100`

Data is saved to `data/todos.json` during local use.
