# Your Site Name

> One sentence: what this site is, who it is for, and what a visitor can do there.

- **Live site:** https://your-username.github.io/your-repo-name/
- **Theme:** (for example: coffee shop, portfolio, animal shelter, or your own idea)
- **Author:** Your Name

Replace everything in *italics* or (parentheses) as you go. Update this file at every milestone: it is part of your grade.

---

## Site map

| Page | File | What a visitor does there |
|------|------|---------------------------|
| Home | `index.html` | (first impression, links to everything) |
| About | `about.html` | (who is behind the site) |
| Contact | `contact.html` | (send a message) |
| (your page) | (`your-page.html`) | (purpose) |

Wireframes: see the [`planning/`](planning/) folder.

---

## How my site reaches your browser (Milestone 1)

Explain, **in your own words**, what happens between typing my URL and seeing my home page. Use real values from my live site.

### 1. The URL

| Part | Value in my URL | What it does |
|------|-----------------|--------------|
| Protocol (scheme) | `https` | *(your explanation)* |
| Host (domain name) | `your-username.github.io` | *(your explanation)* |
| Top-level domain | `io` | *(your explanation)* |
| Path | `/your-repo-name/` | *(your explanation)* |

### 2. DNS lookup

*What does the browser ask the Domain Name System, and what answer comes back? Where can that answer be cached?*

### 3. HTTP request and response

Copied from DevTools (Network tab → first row → Headers):

```text
Request:   GET /your-repo-name/            (method and path)
Host:      your-username.github.io
Status:    200                              (status code and meaning)
Content-Type: text/html; charset=utf-8
(one more response header and what it means)
```

*Explain each line in a sentence.*

### 4. From HTML to a page on screen

*The HTML arrives. What else does the browser request (CSS, images, fonts), and what does it do with them?*

---

## Milestone log

One row per milestone: what you built, and one thing you learned or a problem you solved.

| Milestone | Date | What I built | What I learned / problem I solved |
|-----------|------|--------------|-----------------------------------|
| M1 · Plan and Publish | | | |
| M2 · Semantic Structure | | | |
| M3 · Style System | | | |
| M4 · Tables and Forms | | | |

### Design notes (Milestone 3)

- Colors: *(your custom properties and why you chose them; contrast ratio of body text)*
- Fonts: *(font stacks)*
- Five selector types I used, with one example each: *(element, class, id, descendant or child, pseudo-class, attribute)*

### Testing (before you submit)

| Check | Result | What I fixed |
|-------|--------|--------------|
| W3C HTML validator (every page) | | |
| W3C CSS validator | | |
| Project checker (every page) | | |
| Every nav link works on the live site | | |
| Form tested with bad data (browser validation message appears) | | |
| Keyboard-only walkthrough of the form | | |

---

## Credits

List every image, font, icon, code idea or tutorial you used that is not your own, with a link and its license.

- *(Photo of … by … on …, license …)*
- *(Font: …)*

---

## AI use log

The course AI policy applies to this project: the work must be your own original work, any use of AI tools needs your instructor's approval, and **every use must be disclosed here**. Be ready to explain any line of your code.

| Date | Tool | What I asked or used it for | What I kept, changed or rejected |
|------|------|-----------------------------|----------------------------------|
| | | | |

If you did not use any AI tools, replace the table with this sentence:

> I did not use any AI tools for this project.
