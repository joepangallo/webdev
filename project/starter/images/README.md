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

A phone photo is often 4000 pixels wide and 3 to 5 MB. Your page never shows it that wide, and a file that big is slow to download.

1. Find the widest size the image is shown at (DevTools: hover the `<img>` in the Elements panel). The main column in the starter is at most 960 px wide.
2. Export it at about that width:
   - image inside the main column: about 1000 px wide
   - card image: about 600 px wide
3. Save photos as `.jpg` or `.webp` at a medium quality setting.

Free tools: [Squoosh](https://squoosh.app) in the browser, Preview on macOS (Tools → Adjust Size, then Export), or Photos on Windows (Resize image).

## Write the HTML so the page does not jump

Give every image its real pixel size in the `width` and `height` attributes:

```html
<img src="images/latte-art.jpg" alt="A heart drawn in the foam of a latte" width="1000" height="667">
```

The browser uses those two numbers to reserve space before the file arrives, so the text below does not jump. The starter stylesheet already has `img { max-width: 100%; height: auto; }`, so an image is never wider than the box that contains it and keeps its shape when it is scaled down.

## Captions

When an image needs a caption, wrap the image and the caption in `<figure>` and `<figcaption>`, like the example on the starter home page. The caption is read by everyone; `alt` stands in for the image for people who cannot see it. Do not repeat the same words in both.

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
