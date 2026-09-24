# Course Project: Build One Website, All Month

A handout for instructors and students. The interactive version of this page, with theme picker, saved checklists, planning tools and a project checker, is [`project/index.html`](index.html). Open it in a browser; it works from a downloaded folder as well as online.

Each student builds **one multi-page website** during the one-month module. Every chapter ends with a milestone that adds to the same site, and the finished, published site is the final project. Section numbers and chapter references follow *Fundamentals of Web Development*, 3rd ed. (Connolly & Hoar).

## Contents

- [At a glance](#at-a-glance)
- [How the project works](#how-the-project-works)
- [Pacing](#pacing)
- [Theme ideas](#theme-ideas)
- [Milestones and requirements](#milestones-and-requirements)
- [Rubrics](#rubrics)
- [Submitting](#submitting)
- [Starter files](#starter-files)
- [The project checker](#the-project-checker)
- [Original work and AI tools](#original-work-and-ai-tools)
- [Notes for instructors](#notes-for-instructors)

## At a glance

| Milestone | After | Suggested week | Points |
|-----------|-------|:--------------:|:------:|
| [M1 · Plan and Publish](index.html#m1) | After Chapter 2 | 1 | 10 |
| [M2 · Semantic Structure](index.html#m2) | After Chapter 3 | 1 | 15 |
| [M3 · Style System](index.html#m3) | After Chapter 4 | 2 | 15 |
| [M4 · Tables and Forms](index.html#m4) | After Chapter 5 | 3 | 15 |
| [M5 · Responsive and Interactive](index.html#m5) | After Level Up | 4 | 20 |
| [Final · Polish, Audit and Present](index.html#final) | End of the month | 4 | 25 |
| **Total** | | | **100** |

Each milestone has a checklist of required tasks, optional stretch goals, deliverables and a rubric. The hub page links every milestone to the chapter sections it builds on.

## How the project works

1. **Pick a theme** from the ten ideas below, or propose your own. The same site grows all month, so choose something you will enjoy working on.
2. **Publish early.** By the end of Milestone 1 a placeholder page is live on GitHub Pages. Every later milestone is pushed to the same repository and shows up at the same address.
3. **Build a milestone after each chapter:** plan and publish (Chapter 2), semantic HTML (Chapter 3), one stylesheet (Chapter 4), a data table and a form (Chapter 5), responsive layout and JavaScript (Level Up).
4. **Check as you go.** Tick off tasks on the hub page (saved in your browser), run your pages through the project checker and the W3C validator, and update the milestone log in your README.
5. **Finish strong.** The final week is for auditing, fixing, deploying and a short live demo.

## Pacing

The course runs as a compressed one-month module, so the milestones overlap with the reading. This is the suggested schedule; your instructor's due dates always come first.

| Week | Focus | Milestones |
|------|-------|------------|
| 1 | Chapter 2 (How the Web Works) and Chapter 3 (HTML 1) | M1 by about day 3, M2 by the end of the week |
| 2 | Chapter 4 (CSS 1) | M3 |
| 3 | Chapter 5 (HTML 2: Tables and Forms) | M4 |
| 4 | Level Up (Flexbox, Grid, responsive design, JavaScript, the DOM) | M5 by about day 26, then the Final |

Plan for a few short work sessions per week rather than one long one, and push to GitHub at the end of every session. On the hub page you can enter your course start date to see a target date for each milestone.

## Theme ideas

Every idea is sized for this course: 4–5 pages, one real data table, one form and one JavaScript feature that responds to what the visitor does. Choosing a theme on the hub page personalizes every milestone checklist with that theme's table, form and feature.

| # | Theme | The pitch | Pages | Data table (M4) | Form (M4) | JavaScript feature (M5) | Stretch idea |
|---|-------|-----------|-------|-----------------|-----------|-------------------------|--------------|
| 1 | **Coffee Shop or Food Truck** | A small local business that needs its menu, hours and catering requests online. | `index.html`, `menu.html`, `about.html`, `catering.html`, `visit.html` | a menu table (item, size, price and dietary notes) | a catering request form (contact details, event date, guest count, package and dietary needs) | an "Open now / Closed" badge from the current day and time, plus a day picker that shows the hours for any day | an order builder that totals the menu items a visitor selects |
| 2 | **Personal Portfolio** | Show who you are, what you can do and what you have built, on a site you can keep using after this course. | `index.html`, `projects.html`, `skills.html`, `resume.html`, `contact.html` | a skills table (skill, level, where you used it and a project that shows it) | a contact form (name, email, reason for contact, preferred reply method and message) | a project filter: buttons (All, HTML, CSS, JavaScript) that show and hide project cards | a light and dark theme switch that remembers the visitor's choice with localStorage |
| 3 | **Student Club or Event** | A home base for a club, meetup or one-day event: what, when, where and how to join. | `index.html`, `schedule.html`, `team.html`, `register.html`, `faq.html` | an event schedule (time, session, room and speaker, with times as row headers) | a registration form (name, email, attendee type, sessions to attend and accessibility needs) | a countdown to the event the visitor picks from a list (days, hours and minutes, updating every second) | an FAQ accordion built with &lt;details>, plus an "Expand all" button |
| 4 | **Game Guide or Fan Wiki** | A guide to a game, series or hobby you know well: characters, stats, strategies and tips from the community. | `index.html`, `characters.html`, `stats.html`, `strategy.html`, `tips.html` | a stats table (character or item, class, health, attack and speed) | a submit-a-tip form (username, email, category, difficulty and the tip itself) | a live search box that filters character cards as the visitor types | sort the stats table when a visitor clicks a column's button |
| 5 | **Recipe Collection** | Family favorites or dorm-room staples, with ingredients, steps and nutrition you can actually cook from. | `index.html`, `recipes.html`, `featured.html`, `submit.html`, `about.html` | an ingredients table (amount, unit, ingredient and notes) or a nutrition facts table | a submit-a-recipe form (recipe name, category, prep time, difficulty, ingredients and steps) | a serving-size scaler: pick the number of servings and every ingredient amount recalculates | a shopping-list checklist that remembers checked items with localStorage |
| 6 | **City Travel Guide** | Your hometown or dream city, for a visitor with one weekend: where to go, what it costs and how to plan. | `index.html`, `neighborhoods.html`, `attractions.html`, `food.html`, `plan.html` | an attractions table (name, neighborhood, hours, price and who it is good for) | a trip planner form (travel dates, group size, budget, interests and email) | tabbed neighborhoods: buttons switch between neighborhood panels without reloading the page | a budget estimator that totals attraction prices for the group size |
| 7 | **Animal Shelter or Pet Adoption** | A rescue's website that helps people meet adoptable pets and start an adoption application. | `index.html`, `pets.html`, `process.html`, `apply.html`, `volunteer.html` | an adoptable pets table (name, species, age, size, good with, and fee) | an adoption application (contact details, home type, yard, other pets, the pet you want and why) | filter buttons that show only dogs, cats or other animals | a favorite button on each pet that remembers favorites with localStorage |
| 8 | **Fitness Studio** | A gym, yoga or dance studio site with classes, instructors, a weekly timetable and membership options. | `index.html`, `classes.html`, `schedule.html`, `instructors.html`, `join.html` | a weekly class timetable (days as column headers, times as row headers) | a membership sign-up form (contact details, plan, preferred classes, start date and an emergency contact) | a BMI calculator or an interval workout timer with start, pause and reset buttons | highlight today's column in the timetable using the Date object |
| 9 | **Book or Movie Review Site** | Your reviews of books, films, albums or games, with ratings visitors can sort and a form to add their own. | `index.html`, `reviews.html`, `ratings.html`, `write.html`, `about.html` | a ratings table (title, creator, year, genre and rating out of 5) | a review form with a star rating built from radio buttons in a fieldset, plus title, genre and review text | sort buttons that reorder the ratings table by rating, title or year | an average rating calculated from the table data and shown above it |
| 10 | **Volunteer or Nonprofit Site** | A local cause (a food pantry, park cleanup or tutoring program) that needs volunteers, supplies and donations. | `index.html`, `mission.html`, `shifts.html`, `signup.html`, `donate.html` | a volunteer shifts table (day, time, task, location and spots left) | a volunteer sign-up form (contact details, shift, skills, age confirmation and t-shirt size) | a donation progress bar (the &lt;progress> element) that updates when a visitor makes a pretend pledge | a filter that shows only the shifts that still have spots left |

**Your own idea** is welcome if it has the same four ingredients: 4–5 pages, data that belongs in a table, a reason for visitors to fill in a form, and one interactive feature. Run it past your instructor in week one.

Things to watch for with each theme:

- **Coffee Shop or Food Truck** (JavaScript level: Moderate). Invent the business, or get permission from a real one, so you can use your own photos and prices.
- **Personal Portfolio** (JavaScript level: Moderate). Your repository is public: do not publish your home address or phone number. The contact form is enough.
- **Student Club or Event** (JavaScript level: Moderate). Keep people fictional or get permission: do not publish other students' names or photos without it.
- **Game Guide or Fan Wiki** (JavaScript level: Moderate). Write in your own words and credit the game's creators. Use screenshots sparingly and never copy another wiki's text.
- **Recipe Collection** (JavaScript level: Moderate). Credit recipes you adapt from family, books or websites, and write the steps in your own words.
- **City Travel Guide** (JavaScript level: Moderate). Check hours and prices on official sites and note the date you checked. Use your own photos or credit openly licensed ones.
- **Animal Shelter or Pet Adoption** (JavaScript level: Starter). Use your own pet photos or openly licensed ones, and invent the shelter's details.
- **Fitness Studio** (JavaScript level: Moderate). If you build a BMI calculator, present the result neutrally: it is a rough screening number, not a verdict.
- **Book or Movie Review Site** (JavaScript level: Ambitious). Keep reviews in your own words; use cover images sparingly and credit their source.
- **Volunteer or Nonprofit Site** (JavaScript level: Starter). Never collect real payment details. The pledge is a demo, and the page should say so.

## Milestones and requirements

Text in *your theme's* terms (the table, the form, the JavaScript feature) refers to the plan for the theme you chose; the hub page fills in the exact wording.

### Milestone 1 · Plan and Publish

**When:** After Chapter 2, week 1 · **Points:** 10 · **Builds on:** [2.2 Domain Name System](../ch2/index.html#s2-2), [2.3 Uniform Resource Locators](../ch2/index.html#s2-3), [2.4 Hypertext Transfer Protocol](../ch2/index.html#s2-4), [2.5 Web Browsers](../ch2/index.html#s2-5), [2.6 Web Servers](../ch2/index.html#s2-6)

Decide what you are building, sketch it, set up the project folder and put a placeholder page on the live web. Then explain how that page travels from a server to a visitor's browser.

**Required tasks**

- [ ] Choose your theme. In your README, write one sentence about who the site is for and what a visitor should be able to do there.
- [ ] Plan 4–5 pages (Home plus three or four more pages) and put the site map in your README.
- [ ] Sketch a wireframe of your home page and one inner page (a photo of a paper sketch is fine) and save the images in a `planning/` folder.
- [ ] Set up the project folder: `index.html` at the top, plus `css/`, `js/` and `images/` folders. Use lowercase names with hyphens and no spaces.
- [ ] Create a public GitHub repository and upload or push your files so `index.html` sits at the top level of the repository.
- [ ] Turn on GitHub Pages (**Settings → Pages → Deploy from a branch → main, / (root)**) and confirm your placeholder page loads at its `https://….github.io/…/` address.
- [ ] Add a **How my site reaches your browser** section to your README: label each part of your live URL, explain the DNS lookup, and describe the HTTP request and response.
- [ ] Open DevTools → Network on your live page, reload, and record the document's status code, `Content-Type` and one other response header in your README.

**Stretch goals** (optional)

- Add a custom `404.html`; GitHub Pages serves it automatically when a page is missing.
- Run `nslookup your-username.github.io` in a terminal and explain the answer in your README.
- Add a favicon (an SVG file works) with `<link rel="icon" href="images/favicon.svg">`.

**Deliverables**

- Public GitHub repository with the starter folder structure
- Live GitHub Pages URL showing your placeholder home page
- README: purpose sentence, site map, wireframes in `planning/`, and the How my site reaches your browser section

### Milestone 2 · Semantic Structure

**When:** After Chapter 3, week 1 · **Points:** 15 · **Builds on:** [3.2 HTML Syntax](../ch3/index.html#s3-2), [3.3 Semantic Markup](../ch3/index.html#s3-3), [3.4 Structure of HTML Documents](../ch3/index.html#s3-4), [3.5 Quick Tour of HTML Elements](../ch3/index.html#s3-5), [3.6 HTML5 Semantic Structure Elements](../ch3/index.html#s3-6)

Turn the plan into real pages: valid, semantic HTML that would still make sense with the CSS switched off.

**Required tasks**

- [ ] Build at least three pages from your site map, each a complete document: `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="utf-8">` and a unique `<title>`.
- [ ] Give every page the same skeleton: `<header>`, `<nav>`, `<main>` and `<footer>`.
- [ ] Use exactly one `<h1>` per page and a heading outline with no skipped levels (h1 → h2 → h3).
- [ ] Link all pages through the nav with relative links such as `about.html`, never `C:\...` or `file:///` paths.
- [ ] Use lists where the content really is a list: nav links, features, steps, FAQs.
- [ ] Add images with meaningful `alt` text (`alt=""` only for decorative images) and at least one `<figure>` with a `<figcaption>`.
- [ ] Replace placeholder text with real content for your site on the home page and at least one inner page.
- [ ] Check every page with the W3C validator (validator.w3.org) and fix every error.

**Stretch goals** (optional)

- Use `<section>`, `<article>` or `<aside>` where they match the content.
- Mark up dates with `<time datetime="…">` and contact details with `<address>`.
- Build an FAQ with `<details>` and `<summary>`: interactive with no JavaScript at all.

**Deliverables**

- At least three linked pages, live on GitHub Pages
- Every page passes the W3C HTML validator
- README milestone log updated

### Milestone 3 · Style System

**When:** After Chapter 4, week 2 · **Points:** 15 · **Builds on:** [4.3 Location of Styles](../ch4/index.html#s4-3), [4.4 Selectors](../ch4/index.html#s4-4), [4.5 The Cascade: How Styles Interact](../ch4/index.html#s4-5), [4.6 The Box Model](../ch4/index.html#s4-6), [4.7 CSS Text Styling](../ch4/index.html#s4-7), [4.8 CSS Frameworks and Variables](../ch4/index.html#s4-8)

Give the whole site one consistent look from one stylesheet, built on custom properties so a color or font change happens in exactly one place.

**Required tasks**

- [ ] Link one external stylesheet, `css/styles.css`, from every page and keep all styling in it (no `<style>` blocks, no `style="…"` attributes).
- [ ] Define custom properties in `:root` for colors, fonts and spacing, and use `var(--…)` instead of repeating values.
- [ ] Set up typography: a body font stack with fallbacks, a heading style, sizes for h1–h3 and a comfortable `line-height` (about 1.5 for body text).
- [ ] Use the box model on purpose: `box-sizing: border-box`, padding inside components, margins between them, and a `max-width` so lines of text stay readable.
- [ ] Style the nav as a clear menu with visible `:hover` and `:focus-visible` states and a style for the current page (`[aria-current="page"]`).
- [ ] Use at least five selector types (element, class, id, descendant or child, pseudo-class, attribute) and be ready to point to each one.
- [ ] Check contrast: body text, links and button text at least 4.5:1 against their backgrounds.
- [ ] Organize the stylesheet with comments: tokens, base, layout, components, then page-specific rules.

**Stretch goals** (optional)

- Add a web font from Google Fonts with a matching fallback stack.
- Offer a dark palette by redefining your custom properties inside `@media (prefers-color-scheme: dark)`.
- Add subtle hover transitions and switch them off inside `@media (prefers-reduced-motion: reduce)`.

**Deliverables**

- `css/styles.css` linked from every page
- Before and after screenshots of the home page in your README
- README design notes: palette, fonts and your five selector types

### Milestone 4 · Tables and Forms

**When:** After Chapter 5, week 3 · **Points:** 15 · **Builds on:** [5.1 HTML Tables](../ch5/index.html#s5-1), [5.2 Styling Tables](../ch5/index.html#s5-2), [5.3 Introducing Forms](../ch5/index.html#s5-3), [5.4 Form Control Elements](../ch5/index.html#s5-4), [5.5 Table and Form Accessibility](../ch5/index.html#s5-5), [5.6 Styling and Designing Forms](../ch5/index.html#s5-6), [5.7 Validating User Input](../ch5/index.html#s5-7)

Present real data in an accessible table, and collect input with a form that a keyboard or screen-reader user can complete as easily as anyone else.

**Required tasks**

- [ ] Build the data table from your theme on the page you planned for it.
- [ ] Give the table a `<caption>`, `<thead>` and `<tbody>`, and header cells `<th scope="col">` (plus `scope="row"` on row headers).
- [ ] Fill it with real or realistic data: at least 5 rows and 3 columns. Tables are for data only, never for page layout.
- [ ] Style the table: padding, borders or zebra rows, right-aligned numbers, and a wrapper with `overflow-x: auto` so it never widens the page on a phone.
- [ ] Build the form from your theme on the page you planned for it, with `action` and `method` set.
- [ ] Connect every control to a visible `<label>` with matching `for` and `id` (a placeholder is not a label).
- [ ] Group related controls in a `<fieldset>` with a `<legend>`; every radio-button group needs one.
- [ ] Choose sensible input types (`email`, `tel`, `number`, `date`, `select`, `textarea`…) and give every control a `name`.
- [ ] Add HTML validation (`required`, `min`/`max`, `minlength`, `pattern`) and test it by trying to submit bad data.
- [ ] Style the form: labels above inputs, full-width fields on small screens, a visible focus ring, and an error style with `:user-invalid`.

**Stretch goals** (optional)

- Add a `<tfoot>` with a total or summary row, or use `<colgroup>` to style a column.
- Suggest values with `<datalist>`, or pair a range slider with an `<output>`.
- Write short hints under tricky fields and connect them with `aria-describedby`.

**Deliverables**

- The table page and the form page, live and linked from the nav
- A `thanks.html` page the form submits to
- A screenshot of the browser's validation message in your README

### Milestone 5 · Responsive and Interactive

**When:** After Level Up, week 4 · **Points:** 20 · **Builds on:** [L.1 Flexbox Layout](../levelup/index.html#sl-1), [L.2 CSS Grid](../levelup/index.html#sl-2), [L.3 Responsive Design](../levelup/index.html#sl-3), [L.4 JavaScript Fundamentals](../levelup/index.html#sl-4), [L.5 The DOM and Events](../levelup/index.html#sl-5)

Make the site work from a 320px phone to a wide monitor, and add JavaScript that responds to what the visitor does.

**Required tasks**

- [ ] Make sure every page has `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- [ ] Lay out pages with Flexbox and/or Grid: the header bar, card or content grids, the footer. No floats or tables for layout.
- [ ] Write the CSS mobile-first: base styles for small screens, then `@media (min-width: …)` queries that add columns as space allows.
- [ ] Build a responsive nav: a real `<button>` with `aria-expanded` shows and hides the menu on small screens; the links sit in a row on wider screens.
- [ ] Make images responsive (`max-width: 100%; height: auto;`), resize them to a sensible size, and give each one `width` and `height` attributes.
- [ ] Add the JavaScript feature from your theme in `js/main.js`, wired up with `addEventListener`.
- [ ] Make the feature keyboard-friendly (real `<button>`s and form controls) and announce changing results with `aria-live` where it helps.
- [ ] Test at 390px, 768px and 1280px in DevTools device mode: no sideways scrolling, nothing cut off, tap targets easy to hit.

**Stretch goals** (optional)

- Stretch idea for your theme: the stretch idea listed for your theme.
- Use `srcset` and `sizes` (or `<picture>`) so phones download smaller images.
- Remember a visitor's choice (a filter, a theme) with `localStorage`.

**Deliverables**

- Live, responsive site with the JavaScript feature working
- Screenshots at phone and desktop widths in your README
- README: your breakpoints and a short explanation of what your script does

### Final · Polish, Audit and Present

**When:** End of the month, week 4 · **Points:** 25 · **Builds on:** [L.6 Frameworks and Developer Tools](../levelup/index.html#sl-6), [2.6 Web Servers](../ch2/index.html#s2-6), [5.5 Table and Form Accessibility](../ch5/index.html#s5-5), [L.3 Responsive Design](../levelup/index.html#sl-3)

Ship it like a professional: validate, audit, test on real devices, deploy the final version and show it off in a short demo.

**Required tasks**

- [ ] Every page passes the W3C HTML validator, and your stylesheet passes the W3C CSS validator, with no errors.
- [ ] Every page passes the project checker on this page with no red fails (load the whole site folder, then use **Check every page**).
- [ ] Accessibility audit: run Lighthouse (DevTools → Lighthouse → Accessibility), do a keyboard-only walkthrough and a 200% zoom check, and fix what you find.
- [ ] Image and performance check: every image resized to about its display size (2× for sharp screens) and compressed, typically under 200 KB each.
- [ ] Cross-device test on a real phone and at least two desktop browsers; note what you fixed in your README.
- [ ] Click every link on the live site: no 404s. GitHub Pages treats `Photo.JPG` and `photo.jpg` as different files.
- [ ] Finish the README: description, site map, how it reaches the browser, milestone log, credits for images and code ideas, and the AI use log.
- [ ] Push the final version and confirm the live site shows it (hard refresh: Ctrl + Shift + R, or Cmd + Shift + R on a Mac).
- [ ] Give a 3–5 minute demo: purpose, a tour at phone size, one piece of code you are proud of, one problem you solved, and what you would add next.

**Stretch goals** (optional)

- Score 90 or more in every Lighthouse category.
- Add Open Graph tags (`<meta property="og:title" …>`) so shared links show a preview card.
- Connect a custom domain to your GitHub Pages site (optional and never required).

**Deliverables**

- Final repository URL and live GitHub Pages URL, submitted as your instructor directs
- Complete README, including the testing table, credits and AI use log
- A 3–5 minute live demo

## Rubrics

Each row lists what Excellent, Proficient and Developing work looks like, with the points in *italics*. Excellent earns the row's full points, Proficient about three quarters and Developing about half (rounded to the nearest half point); missing work earns 0. The six rubrics total **100 points**. Your instructor decides how the project counts toward the course grade.

The hub page has a self-check column on every rubric so students can estimate their score before submitting.

### Milestone 1 · Plan and Publish (10 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Plan: purpose, audience and site map | 3 | Clear purpose and audience; 4–5 pages with file names; wireframes for two pages. *(3)* | Site map and purpose present; one wireframe, or the audience is vague. *(2.5)* | Theme named, but the site map or wireframes are missing. *(1.5)* |
| Setup and publishing | 3 | Lowercase, organized folders; placeholder live on GitHub Pages; several meaningful commits. *(3)* | Live, with minor naming or organization issues. *(2.5)* | Not live yet, or `index.html` is not at the top of the repository. *(1.5)* |
| How the web works explanation | 4 | Accurately labels URL parts and explains DNS and the HTTP request and response using real values from DevTools. *(4)* | Mostly accurate; one step is missing or vague. *(3)* | Generic or inaccurate; no evidence from the live site. *(2)* |

### Milestone 2 · Semantic Structure (15 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Valid document structure | 3 | Every page has a DOCTYPE, `lang`, charset and a unique title; the validator reports no errors. *(3)* | Minor validation errors on one page. *(2.5)* | Missing required document parts, or many validation errors. *(1.5)* |
| Semantic landmarks and headings | 4 | header, nav, main and footer on every page; one h1; a logical outline with no skipped levels. *(4)* | Landmarks present; one heading issue. *(3)* | Mostly `<div>`s, or headings chosen for their size. *(2)* |
| Content elements | 4 | Lists, links, images with meaningful alt text, and a figure with a caption, each used for the right reason. *(4)* | All present; alt text or list use could be more meaningful. *(3)* | Images without alt, or lists or figure missing. *(2)* |
| Navigation and links | 2 | Every page reachable from a consistent nav; all links relative and working. *(2)* | One broken or inconsistent link. *(1.5)* | Pages not linked together, or links use paths on your computer. *(1)* |
| Real content | 2 | Home and at least one inner page have real, well-written content. *(2)* | Some placeholder text remains. *(1.5)* | Mostly placeholder text. *(1)* |

### Milestone 3 · Style System (15 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| External stylesheet and organization | 3 | One linked stylesheet for all pages; no inline or embedded styles; clearly commented sections. *(3)* | Linked stylesheet, with a few stray inline styles or little organization. *(2.5)* | Styles scattered across pages, or mostly inline. *(1.5)* |
| Custom properties | 3 | Colors, fonts and spacing defined once in `:root` and reused with `var()` throughout. *(3)* | Some custom properties; many values still repeated. *(2.5)* | No custom properties. *(1.5)* |
| Typography and color | 3 | Consistent type scale and font stacks; all text passes 4.5:1 contrast. *(3)* | Consistent overall; one contrast or sizing issue. *(2.5)* | Inconsistent fonts or sizes, or hard-to-read contrast. *(1.5)* |
| Box model and spacing | 3 | Deliberate padding and margins, border-box sizing, readable line length. *(3)* | Mostly consistent spacing. *(2.5)* | Cramped or uneven spacing; text runs edge to edge. *(1.5)* |
| Selectors and navigation | 3 | Five or more selector types used appropriately; nav has hover, focus and current-page styles. *(3)* | Four selector types, or the nav is missing one state. *(2.5)* | Three or fewer selector types; nav unstyled. *(1.5)* |

### Milestone 4 · Tables and Forms (15 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Table structure and accessibility | 4 | caption, thead and tbody, th with the correct scope, real data, and no layout tables. *(4)* | Structure right; scope or caption missing. *(3)* | No header cells, or the table is used for layout. *(2)* |
| Table styling | 2 | Readable, styled with the site's custom properties, and scrolls inside a wrapper on phones. *(2)* | Styled, but overflows or is hard to scan. *(1.5)* | Unstyled default table. *(1)* |
| Form structure and labels | 4 | Every control labeled; fieldsets with legends; logical order; works with the keyboard alone. *(4)* | One unlabeled control or a missing fieldset. *(3)* | Several unlabeled controls, or placeholder-only labels. *(2)* |
| Input types, names and validation | 3 | Appropriate types, every control named, and validation rules that match the data. *(3)* | Mostly appropriate; one missing name or rule. *(2.5)* | Everything is `type="text"`; no validation. *(1.5)* |
| Form styling and usability | 2 | Matches the site; clear focus and error states; comfortable on a phone. *(2)* | Styled, but focus or error states are missing. *(1.5)* | Default, cramped or overflowing form. *(1)* |

### Milestone 5 · Responsive and Interactive (20 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Flexbox and Grid layout | 4 | Layout built with Flexbox and Grid, each where it fits; no layout hacks. *(4)* | Flexbox or Grid in some places; some awkward spacing. *(3)* | Little or no Flexbox or Grid. *(2)* |
| Mobile-first responsive design | 4 | Mobile-first base with min-width queries; works from 320px to wide screens with no sideways scrolling. *(4)* | Responsive, but desktop-first, or one breakpoint glitch. *(3)* | Breaks or scrolls sideways on a phone. *(2)* |
| Responsive navigation | 3 | Menu button with `aria-expanded` on small screens, a row of links on wide screens; works by keyboard. *(3)* | Works, but lacks `aria-expanded` or keyboard support. *(2.5)* | Nav overflows or is unusable on a phone. *(1.5)* |
| Responsive images | 2 | Images scale, have width and height, and are reasonably sized files. *(2)* | Images scale, but the files are large. *(1.5)* | Images overflow or distort. *(1)* |
| JavaScript feature | 5 | The theme feature works reliably, uses `addEventListener` and DOM updates, is readable and commented, and you can explain it. *(5)* | Works with a minor bug, or the code is hard to follow. *(4)* | Incomplete, broken, or copied without understanding. *(2.5)* |
| Accessible interactivity | 2 | Keyboard operable, real buttons, and changes announced where needed. *(2)* | Mostly keyboard operable. *(1.5)* | Mouse-only (click handlers on `<div>`s). *(1)* |

### Final · Polish, Audit and Present (25 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Completeness | 6 | Every milestone requirement is present and working on the live site. *(6)* | One or two requirements missing or partly working. *(4.5)* | Several requirements missing. *(3)* |
| Code quality and validation | 5 | No validator errors; consistent indentation; meaningful names and comments. *(5)* | A few validator errors or inconsistent formatting. *(4)* | Many errors; hard to read. *(2.5)* |
| Accessibility | 4 | Keyboard walkthrough works; labels, alt text, contrast and headings all correct; Lighthouse issues fixed. *(4)* | One or two accessibility issues remain. *(3)* | Several barriers: unlabeled controls, missing alt text, low contrast. *(2)* |
| Responsive and cross-device | 3 | Tested on a phone and two browsers; no layout breaks. *(3)* | A minor issue on one device or browser. *(2.5)* | Broken on phones, or untested. *(1.5)* |
| Performance and polish | 2 | Optimized images, no broken links, no leftover placeholder text. *(2)* | One or two rough edges. *(1.5)* | Large images, broken links or placeholder content. *(1)* |
| README and AI use log | 2 | Complete README with site map, explanation, milestone log, credits and an AI use log (or a statement that no AI was used). *(2)* | README present; one section thin or missing. *(1.5)* | README missing or minimal; no AI use statement. *(1)* |
| Presentation | 3 | Clear 3–5 minute demo that explains a code decision and a problem solved; answers questions confidently. *(3)* | Clear demo, but thin on the code explanation. *(2.5)* | Unprepared, or far over or under time. *(1.5)* |

## Submitting

You submit **two links**, where and when your instructor asks:

1. **Repository URL**, for example `https://github.com/your-username/your-repo`
2. **Live site URL** from **Settings → Pages**, for example `https://your-username.github.io/your-repo/`

Before you submit:

- [ ] My repository is public and `index.html` is at its top level.
- [ ] My GitHub Pages URL loads in a private or incognito window, so I know I am not seeing a cached copy.
- [ ] Every milestone checklist on this page is complete, or my README says what is missing.
- [ ] Every page passes the project checker with no red fails, and the W3C validators show no errors.
- [ ] My README is complete: description, site map, how it reaches the browser, milestone log, testing table and credits.
- [ ] My README has an AI use log that discloses any AI tool use, or states that I used none, and my work follows the course AI policy.
- [ ] Everything is my own original work or clearly credited (images, fonts, code ideas), and I can explain every line of my code.
- [ ] I submitted both links, the repository URL and the live site URL, the way my instructor asked.
- [ ] I rehearsed my demo with the timer and it fits in 3–5 minutes.

The hub page's **Submission message** builder checks that both links have the right shape and match each other (same username, and the live URL ends with the repository name), then writes a message you can paste.

### Publishing on GitHub Pages

1. Create a **public** repository with a short lowercase name.
2. Upload the *contents* of your project folder (so `index.html` is at the top level, not inside a subfolder), or push with Git:

   ```text
   git init
   git add .
   git commit -m "Milestone 1: placeholder page"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

3. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
4. After a minute or two the address appears at the top of the Pages settings. Open it in a private window.

Common problems: a 404 usually means `index.html` is missing from the top level or is capitalized; missing styles usually mean a wrong path or capitalization (`CSS/Styles.css` vs `css/styles.css`) or a path that starts with `/`. GitHub Pages is a static host: it cannot store form submissions or accept `POST` requests, so forms should use `action="thanks.html" method="get"`.

## Starter files

The [`starter/`](starter/) folder is a small, valid three-page site to copy on day one:

| File | What it gives you |
|------|-------------------|
| [`index.html`](starter/index.html) | Home page with a skip link, header, nav with a menu button, main content, a figure and a footer |
| [`about.html`](starter/about.html) | An inner page with sections, a list and an address |
| [`contact.html`](starter/contact.html) | A deliberately small, accessible form to grow in Milestone 4 |
| [`css/styles.css`](starter/css/styles.css) | Custom properties, a mobile-first base and a commented section for each milestone |
| [`js/main.js`](starter/js/main.js) | A working, commented menu-button script and a marked spot for your own feature |
| [`images/README.md`](starter/images/README.md) | Image sizes, formats, file names and alt text; `placeholder.svg` to replace |
| [`README.md`](starter/README.md) | The README for your own repository: site map, "How my site reaches your browser", milestone log, testing table, credits and AI use log |

To use them:

1. Copy the whole `project/starter` folder out of the course repository and rename it after your site (for example `corner-cup-coffee`).
2. Replace every "Your Site Name" and placeholder paragraph.
3. Rename or add pages to match your site map, and update the nav on every page. The hub's site-map builder and page skeleton generator write this markup for you.
4. Paste the `:root` block from the hub's palette generator over the one in `css/styles.css` once you have chosen your colors.
5. Delete `images/placeholder.svg` when your own images are in.

## The project checker

The checker at the bottom of the hub page (`index.html#checker`) runs the course requirements against your code, in your browser; nothing is uploaded.

- **Paste** a page into the HTML tab and its stylesheet and script into the CSS and JavaScript tabs, or
- **Load files…** to pick individual files, or **Load a folder…** to load the whole site. With a folder, the checker also verifies that `index.html` is at the top, counts your pages, confirms that every local link and image exists with matching capitalization, flags oversized images and compares the nav across pages. **Check every page** gives a summary table for the whole site.

Results are grouped by milestone (M1–M5 and Final), each marked pass, warning, fail or not checked, with a one-line fix and a link to the textbook section that covers it. Filter by milestone, show only problems, or copy a plain-text report into your README. It starts with a sample page that contains six deliberate mistakes, so you can see how it works before loading your own.

What it checks, by milestone:

| Milestone | Checks |
|-----------|--------|
| M1 | `index.html` at the site root; lowercase file names; no `file:///` or `C:\` paths; no paths starting with `/`; lowercase references without spaces; no insecure `http://` resources |
| M2 | DOCTYPE; `<html lang>`; `<meta charset>`; `<title>`; exactly one `<h1>`; no skipped heading levels; `<header>`, `<nav>`, `<main>`, `<footer>`; nav links; `alt` on every image; text on every link; a `<figure>` with `<figcaption>`; lists; at least three pages; no obsolete elements |
| M3 | External stylesheet; no inline `style` attributes or `<style>` blocks; custom properties defined and used; at least five selector types (element, class, id, descendant or child, pseudo-class, attribute); font fallbacks; `box-sizing: border-box`; focus styles; nav styles |
| M4 | Table `<caption>`; `<th scope>`; a label for every control; fieldsets with legends; radio groups in a fieldset; a `name` on every control; validation attributes; form `action` and `method` |
| M5 | Viewport meta; width media queries; mobile-first `min-width` queries; Flexbox or Grid; responsive images; a menu button with `aria-expanded`; a script; `addEventListener`; no inline `onclick`; `defer` on head scripts |
| Final | Meta description; a descriptive title; alt text quality; no `href="#"` placeholders; image `width` and `height`; no leftover placeholder text; local links resolve; image file sizes; the same nav on every page |

The checker is a helper, not a grade. It cannot judge design, writing or whether a script actually works, and it does not replace the [W3C HTML validator](https://validator.w3.org/nu/) or the [W3C CSS validator](https://jigsaw.w3.org/css-validator/).

## Original work and AI tools

The course AI policy applies to every milestone of this project:

- All work must be your own original work, developed through your own thinking.
- Any use of an AI tool requires your instructor's explicit approval.
- Every use must be disclosed in the **AI use log** in your README: the date, the tool, what you asked or used it for, and what you kept, changed or rejected. If you used none, say so in one sentence.
- Be ready to explain any line of your code. Your instructor may ask you to show how you built any part of the site.

Credit everything else that is not yours (photos, icons, fonts, tutorials, code ideas) in the README's Credits section.

## Notes for instructors

- **Checkpoints.** Each milestone lines up with the end of a chapter, so milestones can double as that week's homework. Set real due dates in your LMS; the hub page only suggests targets.
- **Grading flow.** Open the live URL at phone and desktop widths, load the student's repository folder into the checker and press *Check every page*, then score with the milestone rubric. The commit history shows steady progress (or the lack of it).
- **Evidence of learning.** The README template asks for the Milestone 1 explanation of URLs, DNS and HTTP, a milestone log with one thing learned per milestone, design notes, a testing table and an AI use log. A two-minute conversation about one piece of a student's code is a quick originality check.
- **Privacy.** Checklists, theme choice and tool settings on the hub page are stored only in the student's browser (localStorage). They are a planning aid, not a submission. Remind students that their repository is public: no home addresses or phone numbers.
- **Adjusting scope.** For a lighter load, require three pages instead of 4–5 and drop the stretch goals. For a stronger class, require one stretch goal per milestone or a second JavaScript feature.
