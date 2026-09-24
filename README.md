# Web Development I: interactive course companion

An interactive, self-paced companion for an introductory web development course (HTML, CSS and JavaScript). Section numbers and page references follow *Fundamentals of Web Development*, 3rd ed. (Connolly & Hoar), Chapters 2–5. A **Level Up** module covers the course objectives that go past those chapters: responsive layout, JavaScript, the DOM, and frameworks and tools.

Every section pairs a short explanation with something to do: live code playgrounds with automatic checks, simulators (packet switching, DNS lookups, HTTP requests, the box model, specificity, form validation…), drag-and-drop sorting, matching, walkthroughs, flashcards and quizzes. Progress saves in the browser.

**Start here:** open [`index.html`](index.html) in a browser, or publish the repo with GitHub Pages (below).

## What's inside

| Path | What it is |
|------|------------|
| [`index.html`](index.html) | Course dashboard: modules, progress, "continue where you left off", and a course-objective map |
| [`ch2/`](ch2/index.html) | Chapter 2 · How the Web Works (protocols, DNS, URLs, HTTP, browsers, servers) |
| [`ch3/`](ch3/index.html) | Chapter 3 · HTML 1: Introduction (syntax, semantics, document structure, elements, HTML5 structure) |
| [`ch4/`](ch4/index.html) | Chapter 4 · CSS 1: Selectors and Basic Styling (syntax, selectors, cascade, box model, text, variables and frameworks) |
| [`ch5/`](ch5/index.html) | Chapter 5 · HTML 2: Tables and Forms (tables, forms, controls, accessibility, styling, validation) |
| [`levelup/`](levelup/index.html) | Level Up · Responsive Layout & JavaScript (flexbox, grid, responsive design, JS, DOM and events, tools) |
| [`project/`](project/index.html) | The incremental course project: one milestone per chapter covered so far (Chapters 2–5), ten theme ideas, rubrics, starter files and an HTML checker |
| [`tools/playground.html`](tools/playground.html) | Full-page HTML/CSS/JS playground with templates, console, device widths and download |
| [`glossary.html`](glossary.html) | 200+ searchable terms linked to the section that teaches each one, with a flashcard mode |
| [`docs/`](docs/AUTHORING.md) | Authoring guide and a live component gallery for adding or editing lessons |
| `assets/` | The shared stylesheet and JavaScript runtime every page uses |

## Course objectives → modules

| # | Objective | Where it is practiced |
|---|-----------|------------------------|
| 1 | Identify the technologies and protocols used in hosting and developing applications on the web | Ch 2 (all), 5.3, L.6 |
| 2 | Build appropriately structured and valid web pages using HTML | Ch 3, Ch 5 |
| 3 | Implement CSS syntax to layout and format HTML elements and style web pages | Ch 4, 5.2, 5.6, L.1, L.2 |
| 4 | Examine the box and document object models used to structure and layout web page elements | 2.5, 3.4, 4.6, L.5 |
| 5 | Discuss responsive web design principles and how they are used to build cross-platform applications | L.1, L.2, L.3 |
| 6 | Design responsive web pages that incorporate images, tables, forms, and navigation menus | 3.5, 3.6, Ch 5, L.1–L.3, the project |
| 7 | Code interactive web pages that respond to user input and events using JavaScript | 5.7, L.4, L.5 |
| 8 | Distinguish between various frameworks and third-party tools used to enhance the web development process | 4.8, L.6 |

The dashboard shows the same map interactively, with each student's progress per objective.

## The course project

Students build **one website that grows with the class**: one milestone after each chapter discussed, each worth 25 points. The project only uses material that has been covered, which is Chapters 2–5 so far, and a new milestone is added as each new chapter is covered. Students submit their repository URL and live GitHub Pages URL when the instructor asks; every milestone is pushed to the same repository, so the same two links always show the latest work. See [`project/README.md`](project/README.md) for the full handout.

| Milestone | After | Adds |
|-----------|-------|------|
| M1 · Plan and Publish | Ch 2 | Theme, site map, folder structure, a live placeholder page, and a README explaining how the site reaches the browser |
| M2 · Semantic Structure | Ch 3 | Three or more pages of valid, semantic HTML |
| M3 · Style System | Ch 4 | One external stylesheet with custom properties, typography and a styled nav |
| M4 · Tables and Forms | Ch 5 | A real data table and an accessible, validated form |

Theme ideas include a food truck, personal portfolio, club or event site, game guide, recipe collection, city travel guide, pet adoption, fitness studio, review site and volunteer nonprofit. Each one comes with a table idea and a form idea. Starter files are in [`project/starter/`](project/starter/).

## Publish it with GitHub Pages

1. Push this repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

The `.nojekyll` file tells GitHub Pages to serve the files as they are.

## How it works

- **No build step and no dependencies.** Plain HTML, CSS and vanilla JavaScript. Every page works when opened straight from disk. The only network request is for web fonts; without them the pages fall back to system fonts.
- **Progress is private to each browser.** Completed sections, quiz scores, challenge results and playground code are saved in `localStorage`. Students can export and import their progress from the dashboard.
- **Light and dark themes** follow the system setting, with a toggle in the top bar.
- **Accessible by design.** Real buttons and labels, keyboard support for every activity, visible focus, and reduced-motion support.

## For instructors: editing and adding lessons

- [`docs/AUTHORING.md`](docs/AUTHORING.md) documents the page skeleton, every component's markup (quiz, flashcards, playground with checks, match, order, sort, walkthrough, fill-in, tabs) and the JavaScript API.
- [`docs/components.html`](docs/components.html) shows every component live.
- The module and section list lives in one place, `WD1.MODULES` in [`assets/js/course.js`](assets/js/course.js). Adding a section there puts it in the navigation, the dashboard and the objective map.

The course syllabus is deliberately kept out of this public repository (see `.gitignore`).
