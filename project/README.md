# Course Project: Build One Website, Chapter by Chapter

A handout for instructors and students. The interactive version of this page, with theme picker, saved checklists, planning tools and a project checker, is [`project/index.html`](index.html). Open it in a browser; it works from a downloaded folder as well as online.

Each student builds **one multi-page website** that grows with the class. Every chapter we cover ends with a milestone that adds to the same site, so the project only ever uses material that has been discussed. It covers Chapters 2–5 so far; a new milestone is added as each new chapter is covered. Section numbers and chapter references follow *Fundamentals of Web Development*, 3rd ed. (Connolly & Hoar).

## Contents

- [At a glance](#at-a-glance)
- [How the project works](#how-the-project-works)
- [Theme ideas](#theme-ideas)
- [Milestones and requirements](#milestones-and-requirements)
- [Rubrics](#rubrics)
- [Submitting](#submitting)
- [Starter files](#starter-files)
- [The project checker](#the-project-checker)
- [Original work and AI tools](#original-work-and-ai-tools)
- [Notes for instructors](#notes-for-instructors)

## At a glance

| Milestone | After | Points |
|-----------|-------|:------:|
| [M1 · Plan and Publish](index.html#m1) | After Chapter 2 | 25 |
| [M2 · Semantic Structure](index.html#m2) | After Chapter 3 | 25 |
| [M3 · Style System](index.html#m3) | After Chapter 4 | 25 |
| [M4 · Tables and Forms](index.html#m4) | After Chapter 5 | 25 |
| **Total** | | **100** |

Each milestone has a checklist of required tasks, optional stretch goals, deliverables and a rubric. The hub page links every milestone to the chapter sections it builds on.

## How the project works

1. **Pick a theme** from the ten ideas below, or propose your own. The same site grows through every milestone, so choose something you will enjoy working on.
2. **Publish early.** By the end of Milestone 1 a placeholder page is live on GitHub Pages. Every later milestone is pushed to the same repository and shows up at the same address.
3. **Build a milestone after each chapter:** plan and publish (Chapter 2), semantic HTML (Chapter 3), one stylesheet (Chapter 4), and a data table and a form (Chapter 5).
4. **Check as you go.** Tick off tasks on the hub page (saved in your browser), run your pages through the project checker and the W3C validator, and update the milestone log in your README.
5. **Submit.** Submit your repository and live site links when your instructor asks. Every milestone is pushed to the same repository, so the same two links always show your latest work.

## Theme ideas

Every idea is sized for Chapters 2–5: 4–5 pages, one real data table and one form. Choosing a theme on the hub page personalizes every milestone checklist with that theme's table and form.

| # | Theme | The pitch | Pages | Data table (M4) | Form (M4) | Stretch idea |
|---|-------|-----------|-------|-----------------|-----------|--------------|
| 1 | **Coffee Shop or Food Truck** | A small local business that needs its menu, hours and catering requests online. | `index.html`, `menu.html`, `about.html`, `catering.html`, `visit.html` | a menu table (item, size, price and dietary notes) | a catering request form (contact details, event date, guest count, package and dietary needs) | a second table for the weekly opening hours, with the days as row headers |
| 2 | **Personal Portfolio** | Show who you are, what you can do and what you have built, on a site you can keep using after this course. | `index.html`, `projects.html`, `skills.html`, `resume.html`, `contact.html` | a skills table (skill, level, where you used it and a project that shows it) | a contact form (name, email, reason for contact, preferred reply method and message) | a `<figure>` for each project, with a screenshot and a caption that says what you built |
| 3 | **Student Club or Event** | A home base for a club, meetup or one-day event: what, when, where and how to join. | `index.html`, `schedule.html`, `team.html`, `register.html`, `faq.html` | an event schedule (time, session, room and speaker, with times as row headers) | a registration form (name, email, attendee type, sessions to attend and accessibility needs) | an FAQ built with `<details>` and `<summary>` |
| 4 | **Game Guide or Fan Wiki** | A guide to a game, series or hobby you know well: characters, stats, strategies and tips from the community. | `index.html`, `characters.html`, `stats.html`, `strategy.html`, `tips.html` | a stats table (character or item, class, health, attack and speed) | a submit-a-tip form (username, email, category, difficulty and the tip itself) | a `<colgroup>` that highlights one stats column, plus zebra rows styled with `:nth-child()` |
| 5 | **Recipe Collection** | Family favorites or dorm-room staples, with ingredients, steps and nutrition you can actually cook from. | `index.html`, `recipes.html`, `featured.html`, `submit.html`, `about.html` | an ingredients table (amount, unit, ingredient and notes) or a nutrition facts table | a submit-a-recipe form (recipe name, category, prep time, difficulty, ingredients and steps) | a second table for nutrition facts, with a `<tfoot>` total row |
| 6 | **City Travel Guide** | Your hometown or dream city, for a visitor with one weekend: where to go, what it costs and how to plan. | `index.html`, `neighborhoods.html`, `attractions.html`, `food.html`, `plan.html` | an attractions table (name, neighborhood, hours, price and who it is good for) | a trip planner form (travel dates, group size, budget, interests and email) | a `<figure>` for each neighborhood, with a caption that says where the photo was taken |
| 7 | **Animal Shelter or Pet Adoption** | A rescue's website that helps people meet adoptable pets and start an adoption application. | `index.html`, `pets.html`, `process.html`, `apply.html`, `volunteer.html` | an adoptable pets table (name, species, age, size, good with, and fee) | an adoption application (contact details, home type, yard, other pets, the pet you want and why) | an adoption FAQ built with `<details>` and `<summary>` |
| 8 | **Fitness Studio** | A gym, yoga or dance studio site with classes, instructors, a weekly timetable and membership options. | `index.html`, `classes.html`, `schedule.html`, `instructors.html`, `join.html` | a weekly class timetable (days as column headers, times as row headers) | a membership sign-up form (contact details, plan, preferred classes, start date and an emergency contact) | a membership price table that compares the plans, with the plan names as column headers |
| 9 | **Book or Movie Review Site** | Your reviews of books, films, albums or games, with ratings visitors can sort and a form to add their own. | `index.html`, `reviews.html`, `ratings.html`, `write.html`, `about.html` | a ratings table (title, creator, year, genre and rating out of 5) | a review form with a star rating built from radio buttons in a fieldset, plus title, genre and review text | a `<tfoot>` row that shows the average rating, worked out by hand from the table |
| 10 | **Volunteer or Nonprofit Site** | A local cause (a food pantry, park cleanup or tutoring program) that needs volunteers, supplies and donations. | `index.html`, `mission.html`, `shifts.html`, `signup.html`, `donate.html` | a volunteer shifts table (day, time, task, location and spots left) | a volunteer sign-up form (contact details, shift, skills, age confirmation and t-shirt size) | a `<progress>` bar that shows how many of the shifts are already filled |

**Your own idea** is welcome if it has the same three ingredients: 4–5 pages, data that belongs in a table, and a reason for visitors to fill in a form. Run it past your instructor before you start Milestone 1.

Things to watch for with each theme:

- **Coffee Shop or Food Truck**. Invent the business, or get permission from a real one, so you can use your own photos and prices.
- **Personal Portfolio**. Your repository is public: do not publish your home address or phone number. The contact form is enough.
- **Student Club or Event**. Keep people fictional or get permission: do not publish other students' names or photos without it.
- **Game Guide or Fan Wiki**. Write in your own words and credit the game's creators. Use screenshots sparingly and never copy another wiki's text.
- **Recipe Collection**. Credit recipes you adapt from family, books or websites, and write the steps in your own words.
- **City Travel Guide**. Check hours and prices on official sites and note the date you checked. Use your own photos or credit openly licensed ones.
- **Animal Shelter or Pet Adoption**. Use your own pet photos or openly licensed ones, and invent the shelter's details.
- **Fitness Studio**. Keep classes and instructors fictional, or get permission before you use real names and photos.
- **Book or Movie Review Site**. Keep reviews in your own words; use cover images sparingly and credit their source.
- **Volunteer or Nonprofit Site**. Never collect real personal details. The sign-up form is a demo, and the page should say so.

## Milestones and requirements

Text in *your theme's* terms (the table, the form) refers to the plan for the theme you chose; the hub page fills in the exact wording.

### Milestone 1 · Plan and Publish

**When:** After Chapter 2 · **Points:** 25 · **Builds on:** [2.2 Domain Name System](../ch2/index.html#s2-2), [2.3 Uniform Resource Locators](../ch2/index.html#s2-3), [2.4 Hypertext Transfer Protocol](../ch2/index.html#s2-4), [2.5 Web Browsers](../ch2/index.html#s2-5), [2.6 Web Servers](../ch2/index.html#s2-6)

Decide what you are building, sketch it, set up the project folder and put a placeholder page on the live web. Then explain how that page travels from a server to a visitor's browser.

**Required tasks**

- [ ] Choose your theme. In your README, write one sentence about who the site is for and what a visitor should be able to do there.
- [ ] Plan 4–5 pages (Home plus three or four more pages) and put the site map in your README.
- [ ] Sketch a wireframe of your home page and one inner page (a photo of a paper sketch is fine) and save the images in a `planning/` folder.
- [ ] Set up the project folder: `index.html` at the top, plus `css/` and `images/` folders. Use lowercase names with hyphens and no spaces.
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

**When:** After Chapter 3 · **Points:** 25 · **Builds on:** [3.2 HTML Syntax](../ch3/index.html#s3-2), [3.3 Semantic Markup](../ch3/index.html#s3-3), [3.4 Structure of HTML Documents](../ch3/index.html#s3-4), [3.5 Quick Tour of HTML Elements](../ch3/index.html#s3-5), [3.6 HTML5 Semantic Structure Elements](../ch3/index.html#s3-6)

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

**When:** After Chapter 4 · **Points:** 25 · **Builds on:** [4.3 Location of Styles](../ch4/index.html#s4-3), [4.4 Selectors](../ch4/index.html#s4-4), [4.5 The Cascade: How Styles Interact](../ch4/index.html#s4-5), [4.6 The Box Model](../ch4/index.html#s4-6), [4.7 CSS Text Styling](../ch4/index.html#s4-7), [4.8 CSS Frameworks and Variables](../ch4/index.html#s4-8)

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
- Define a second palette by overriding your custom properties on one class (for example `.theme-night`) and apply it to a single section.
- Use `:nth-child()` or `::first-letter` to add one styling detail that needs no extra HTML.

**Deliverables**

- `css/styles.css` linked from every page
- Before and after screenshots of the home page in your README
- README design notes: palette, fonts and your five selector types

### Milestone 4 · Tables and Forms

**When:** After Chapter 5 · **Points:** 25 · **Builds on:** [5.1 HTML Tables](../ch5/index.html#s5-1), [5.2 Styling Tables](../ch5/index.html#s5-2), [5.3 Introducing Forms](../ch5/index.html#s5-3), [5.4 Form Control Elements](../ch5/index.html#s5-4), [5.5 Table and Form Accessibility](../ch5/index.html#s5-5), [5.6 Styling and Designing Forms](../ch5/index.html#s5-6), [5.7 Validating User Input](../ch5/index.html#s5-7)

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
- Stretch idea for your theme: the stretch idea listed for your theme.

**Deliverables**

- The table page and the form page, live and linked from the nav
- A `thanks.html` page the form submits to
- A screenshot of the browser's validation message in your README

## Rubrics

Each row lists what Excellent, Proficient and Developing work looks like, with the points in *italics*. Excellent earns the row's full points, Proficient about three quarters and Developing about half (rounded to the nearest half point); missing work earns 0. Each milestone rubric is worth **25 points**. Your instructor decides how the project counts toward the course grade.

The hub page has a self-check column on every rubric so students can estimate their score before submitting.

### Milestone 1 · Plan and Publish (25 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Plan: purpose, audience and site map | 8 | Clear purpose and audience; 4–5 pages with file names; wireframes for two pages. *(8)* | Site map and purpose present; one wireframe, or the audience is vague. *(6)* | Theme named, but the site map or wireframes are missing. *(4)* |
| Setup and publishing | 8 | Lowercase, organized folders; placeholder live on GitHub Pages; several meaningful commits. *(8)* | Live, with minor naming or organization issues. *(6)* | Not live yet, or `index.html` is not at the top of the repository. *(4)* |
| How the web works explanation | 9 | Accurately labels URL parts and explains DNS and the HTTP request and response using real values from DevTools. *(9)* | Mostly accurate; one step is missing or vague. *(7)* | Generic or inaccurate; no evidence from the live site. *(4.5)* |

### Milestone 2 · Semantic Structure (25 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Valid document structure | 5 | Every page has a DOCTYPE, `lang`, charset and a unique title; the validator reports no errors. *(5)* | Minor validation errors on one page. *(4)* | Missing required document parts, or many validation errors. *(2.5)* |
| Semantic landmarks and headings | 6 | header, nav, main and footer on every page; one h1; a logical outline with no skipped levels. *(6)* | Landmarks present; one heading issue. *(4.5)* | Mostly `<div>`s, or headings chosen for their size. *(3)* |
| Content elements | 6 | Lists, links, images with meaningful alt text, and a figure with a caption, each used for the right reason. *(6)* | All present; alt text or list use could be more meaningful. *(4.5)* | Images without alt, or lists or figure missing. *(3)* |
| Navigation and links | 4 | Every page reachable from a consistent nav; all links relative and working. *(4)* | One broken or inconsistent link. *(3)* | Pages not linked together, or links use paths on your computer. *(2)* |
| Real content | 4 | Home and at least one inner page have real, well-written content. *(4)* | Some placeholder text remains. *(3)* | Mostly placeholder text. *(2)* |

### Milestone 3 · Style System (25 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| External stylesheet and organization | 5 | One linked stylesheet for all pages; no inline or embedded styles; clearly commented sections. *(5)* | Linked stylesheet, with a few stray inline styles or little organization. *(4)* | Styles scattered across pages, or mostly inline. *(2.5)* |
| Custom properties | 5 | Colors, fonts and spacing defined once in `:root` and reused with `var()` throughout. *(5)* | Some custom properties; many values still repeated. *(4)* | No custom properties. *(2.5)* |
| Typography and color | 5 | Consistent type scale and font stacks; all text passes 4.5:1 contrast. *(5)* | Consistent overall; one contrast or sizing issue. *(4)* | Inconsistent fonts or sizes, or hard-to-read contrast. *(2.5)* |
| Box model and spacing | 5 | Deliberate padding and margins, border-box sizing, readable line length. *(5)* | Mostly consistent spacing. *(4)* | Cramped or uneven spacing; text runs edge to edge. *(2.5)* |
| Selectors and navigation | 5 | Five or more selector types used appropriately; nav has hover, focus and current-page styles. *(5)* | Four selector types, or the nav is missing one state. *(4)* | Three or fewer selector types; nav unstyled. *(2.5)* |

### Milestone 4 · Tables and Forms (25 points)

| Criterion | Points | Excellent | Proficient | Developing |
|-----------|:------:|-----------|------------|------------|
| Table structure and accessibility | 6 | caption, thead and tbody, th with the correct scope, real data, and no layout tables. *(6)* | Structure right; scope or caption missing. *(4.5)* | No header cells, or the table is used for layout. *(3)* |
| Table styling | 4 | Readable, styled with the site's custom properties, and scrolls inside a wrapper on phones. *(4)* | Styled, but overflows or is hard to scan. *(3)* | Unstyled default table. *(2)* |
| Form structure and labels | 6 | Every control labeled; fieldsets with legends; logical order; works with the keyboard alone. *(6)* | One unlabeled control or a missing fieldset. *(4.5)* | Several unlabeled controls, or placeholder-only labels. *(3)* |
| Input types, names and validation | 5 | Appropriate types, every control named, and validation rules that match the data. *(5)* | Mostly appropriate; one missing name or rule. *(4)* | Everything is `type="text"`; no validation. *(2.5)* |
| Form styling and usability | 4 | Matches the site; clear focus and error states; comfortable on a phone. *(4)* | Styled, but focus or error states are missing. *(3)* | Default, cramped or overflowing form. *(2)* |

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

The [`starter/`](starter/) folder is a small, valid three-page site to copy when you start Milestone 1:

| File | What it gives you |
|------|-------------------|
| [`index.html`](starter/index.html) | Home page with a skip link, header, nav, main content, a figure and a footer |
| [`about.html`](starter/about.html) | An inner page with sections, a list and an address |
| [`contact.html`](starter/contact.html) | A deliberately small, accessible form to grow in Milestone 4 |
| [`css/styles.css`](starter/css/styles.css) | Custom properties, base styles and a commented section for each milestone |
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

- **Paste** a page into the HTML tab and its stylesheet into the CSS tab, or
- **Load files…** to pick individual files, or **Load a folder…** to load the whole site. With a folder, the checker also verifies that `index.html` is at the top, counts your pages, confirms that every local link and image exists with matching capitalization, and compares the nav across pages. **Check every page** gives a summary table for the whole site.

Results are grouped by milestone (M1–M4), each marked pass, warning, fail or not checked, with a one-line fix and a link to the textbook section that covers it. Filter by milestone, show only problems, or copy a plain-text report into your README. It starts with a sample page that contains six deliberate mistakes, so you can see how it works before loading your own.

What it checks, by milestone:

| Milestone | Checks |
|-----------|--------|
| M1 | `index.html` at the site root; lowercase file names; no `file:///` or `C:\` paths; no paths starting with `/`; lowercase references without spaces; no insecure `http://` resources |
| M2 | DOCTYPE; `<html lang>`; `<meta charset>`; `<title>`; exactly one `<h1>`; no skipped heading levels; `<header>`, `<nav>`, `<main>`, `<footer>`; nav links; `alt` on every image; text on every link; a `<figure>` with `<figcaption>`; lists; at least three pages; no obsolete elements; a meta description; a descriptive title; alt text quality; no `href="#"` placeholders; image `width` and `height`; no leftover placeholder text; local links resolve; the same nav on every page |
| M3 | External stylesheet; no inline `style` attributes or `<style>` blocks; custom properties defined and used; at least five selector types (element, class, id, descendant or child, pseudo-class, attribute); font fallbacks; `box-sizing: border-box`; focus styles; nav styles |
| M4 | Table `<caption>`; `<th scope>`; a label for every control; fieldsets with legends; radio groups in a fieldset; a `name` on every control; validation attributes; form `action` and `method` |

The checker is a helper, not a grade. It cannot judge design or writing, and it does not replace the [W3C HTML validator](https://validator.w3.org/nu/) or the [W3C CSS validator](https://jigsaw.w3.org/css-validator/).

## Original work and AI tools

The course AI policy applies to every milestone of this project:

- All work must be your own original work, developed through your own thinking.
- Any use of an AI tool requires your instructor's explicit approval.
- Every use must be disclosed in the **AI use log** in your README: the date, the tool, what you asked or used it for, and what you kept, changed or rejected. If you used none, say so in one sentence.
- Be ready to explain any line of your code. Your instructor may ask you to show how you built any part of the site.

Credit everything else that is not yours (photos, icons, fonts, tutorials, code ideas) in the README's Credits section.

## Notes for instructors

- **Checkpoints.** Each milestone lines up with the end of a chapter, so milestones can double as that week's homework. Set real due dates in your LMS.
- **Grading flow.** Open the live URL, load the student's repository folder into the checker and press *Check every page*, then score with the milestone rubric. The commit history shows steady progress (or the lack of it).
- **Evidence of learning.** The README template asks for the Milestone 1 explanation of URLs, DNS and HTTP, a milestone log with one thing learned per milestone, design notes, a testing table and an AI use log. A two-minute conversation about one piece of a student's code is a quick originality check.
- **Privacy.** Checklists, theme choice and tool settings on the hub page are stored only in the student's browser (localStorage). They are a planning aid, not a submission. Remind students that their repository is public: no home addresses or phone numbers.
- **Adjusting scope.** For a lighter load, require three pages instead of 4–5 and drop the stretch goals. For a stronger class, require one stretch goal per milestone.
