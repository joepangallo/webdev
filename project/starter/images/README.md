# Images for your site

Put every image your site uses in this folder, then delete `placeholder.svg` once nothing links to it.

## Name files so the server can find them

GitHub Pages runs on a server that treats `Photo.JPG` and `photo.jpg` as **different files**. A link that works on your laptop can 404 once the site is live.

- lowercase letters, numbers and hyphens only: `latte-art.jpg`, `team-photo-2.webp`
- no spaces, no `IMG_4031.JPG`: rename photos straight off a phone
- describe the content, not the order: `river-trail.jpg` beats `image3.jpg`

## Pick the right format

| Use it for | Format | Why |
|------------|--------|-----|
| Photos | `.jpg` or `.webp` | Small files for complex images. WebP is usually 25–35% smaller than JPEG at the same quality. |
| Screenshots, images with sharp text, transparency | `.png` or `.webp` | Keeps edges crisp. |
| Logos, icons, simple drawings | `.svg` | A text file that stays sharp at any size. |
| Animation | `.webp` or a short `.mp4` in `<video>` | Animated GIFs are huge. |

## Resize before you upload

A phone photo is often 4000 pixels wide and 3 to 5 MB. Your page never shows it that wide.

1. Find the widest size the image is shown at (DevTools: hover the `<img>` in the Elements panel).
2. Export it at about **2×** that width so it stays sharp on high-density screens:
   - full-width banner: about 1600 px wide
   - image inside the main text column: about 1200 px wide
   - card thumbnail: about 600–800 px wide
3. Compress it. Aim for **under 200 KB** for most images and under about 350 KB for a large banner.

Free tools: [Squoosh](https://squoosh.app) in the browser, Preview on macOS (Tools → Adjust Size, then Export), or Photos on Windows (Resize image).

## Write the HTML so the page does not jump

Give every image its real pixel size, and let CSS make it responsive:

```html
<img src="images/latte-art.jpg" alt="A heart drawn in the foam of a latte" width="1200" height="800">
```

The starter stylesheet already has `img { max-width: 100%; height: auto; }`, so the image shrinks on small screens while the browser still reserves the right amount of space.

## Alt text

Ask: *what would someone miss if they could not see this image?* Write that, briefly.

| Image | Good `alt` | Why |
|-------|-----------|-----|
| Photo of a dish on the menu | `Bowl of chili topped with cheddar and green onions` | Describes what matters to the visitor. |
| Your logo linking to the home page | `Your Site Name home` | A linked image describes where the link goes. |
| A decorative swirl or background texture | `alt=""` (empty, but present) | Tells screen readers to skip it. |
| A chart | A one-sentence takeaway, with the data in a table or text nearby | Charts need their meaning, not their shape. |

Avoid:

- starting with "Image of" or "Picture of": screen readers already say "image"
- the file name (`alt="IMG_4031.jpg"`)
- leaving `alt` off entirely: screen readers may read the file name aloud

## Credit what is not yours

Use your own photos when you can. If you use someone else's image, pick openly licensed ones (for example from Unsplash, Pexels or Wikimedia Commons), follow the license, and list the creator and source in the **Credits** section of your README.
