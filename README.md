# sidenotesjs

Convert Markdown footnotes into inline sidenotes. No jQuery required.

A modern ES module rewrite of [jquery.sidenotes](https://github.com/acdlite/jquery.sidenotes) by Andrew Clark.

---

## What it does

Given standard Markdown-generated footnote HTML:

```html
<article class="post">
  <p>Some text with a footnote.<sup id="fnref:1"><a href="#fn:1">1</a></sup></p>
  <div class="footnotes">
    <ol>
      <li id="fn:1">The footnote content. <a href="#fnref:1">↩</a></li>
    </ol>
  </div>
</article>
```

The plugin moves each footnote next to its reference mark in the text:

```html
<article class="post">
  <aside class="sidenote" id="sn:1">The footnote content. <a href="#fnref:1">↩</a></aside>
  <p>Some text with a footnote.<sup id="fnref:1"><a href="#sn:1">1</a></sup></p>
  <div class="footnotes" style="display: none">…</div>
</article>
```

When multiple footnotes in the same block element are grouped, they are wrapped in a single `<section class="sidenoteGroup">`.

---

## Installation

```bash
npm install sidenotesjs
```

Or via a `<script>` tag (IIFE build, exposes `window.Sidenotes`):

```html
<script src="dist/sidenotes.min.js"></script>
```

---

## Usage

```js
import Sidenotes from 'sidenotesjs';

const sn = new Sidenotes(document.querySelector('.post'));
```

### Methods

| Method | Description |
|--------|-------------|
| `new Sidenotes(element, options)` | Initialize on a container element |
| `sn.show()` | Show all sidenotes, hide the footnote container |
| `sn.hide()` | Hide all sidenotes, show the footnote container |
| `sn.placement('before'\|'after')` | Get or set sidenote placement relative to their pivot |
| `sn.sidenotePlacement(value)` | Alias for `placement()` |
| `sn.destroy()` | Remove all sidenote elements and restore the original DOM |

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `footnoteContainer` | `string` | `'.footnotes'` | Selector for the footnote list container |
| `footnoteElement` | `string` | `'li'` | Selector for individual footnote elements |
| `footnoteBacklinkSelector` | `string` | `'a'` | Selector for the backlink (↩) inside a footnote |
| `removeRefMarkRegex` | `RegExp\|false` | `false` | Footnote IDs matching this regex get `ref = null` (no counter) |
| `initiallyHidden` | `boolean` | `false` | Start with sidenotes hidden and footnotes visible |
| `sidenotePlacement` | `'before'\|'after'` | `'before'` | Whether to place sidenotes before or after their pivot element |
| `sidenoteElement` | `string` | `'aside'` | HTML tag used for each sidenote |
| `sidenoteClass` | `string` | `'sidenote'` | CSS class applied to each sidenote element |
| `sidenoteGroupElement` | `string` | `'section'` | HTML tag used for grouped sidenotes |
| `sidenoteGroupClass` | `string` | `'sidenoteGroup'` | CSS class applied to group elements |
| `show` | `function` | `el => el.style.display = ''` | Custom show callback — receives the DOM element |
| `hide` | `function` | `el => el.style.display = 'none'` | Custom hide callback — receives the DOM element |
| `formatSidenote` | `function\|null` | `null` | Custom sidenote builder: `(html, id, ref) => Element` |

### Example with options

```js
const sn = new Sidenotes(document.querySelector('.post'), {
  sidenotePlacement: 'after',
  initiallyHidden: true,
  removeRefMarkRegex: /fn:disclaimer/,
  sidenoteClass: 'marginnote',
  show: el => el.classList.remove('hidden'),
  hide: el => el.classList.add('hidden'),
});
```

---

## CSS

The plugin only manages DOM structure — it does not apply any visual positioning. Add CSS to position sidenotes in the margin:

```css
.post {
  max-width: 620px;
  position: relative;
}

.post p {
  position: relative; /* gives sidenotes a positioning context */
}

.sidenote {
  position: absolute;
  left: calc(100% + 2rem);
  top: 0;
  width: 220px;
  font-size: 0.85em;
}

/* Hide sidenotes on narrow viewports */
@media (max-width: 900px) {
  .sidenote, .sidenoteGroup { display: none !important; }
  .footnotes { display: block !important; }
}
```

---

## How grouping works

When two consecutive footnotes have reference marks inside the same block element (their *pivot*), they are wrapped together in a `<section class="sidenoteGroup">`. The group is inserted adjacent to the shared pivot, and visibility is managed at the group level.

---

## Nested footnotes

A footnote is considered *nested* when its reference mark (`<a href="#fn:X">`) is found inside the footnote container rather than the main body text. Nested footnotes inherit their pivot from the footnote that contains their reference mark.

---

## Migration from jquery.sidenotes

| jquery.sidenotes | sidenotesjs |
|-----------------|-------------|
| `$('.post').sidenotes(opts)` | `new Sidenotes(el, opts)` |
| `.sidenotes('show')` | `sn.show()` |
| `.sidenotes('hide')` | `sn.hide()` |
| `.sidenotes('placement', 'after')` | `sn.placement('after')` |
| `.sidenotes('destroy')` | `sn.destroy()` |

---

## Development

```bash
npm install        # install dev dependencies
npm test           # run tests (vitest)
npm run test:watch # run tests in watch mode
npm run coverage   # generate coverage report
npm run build      # build dist/ (ESM + CJS + minified IIFE)
```

The demo page at `demo/index.html` can be opened directly in a browser — it loads `src/sidenotes.js` as a native ES module, no build step required.

---

## Browser compatibility

Uses `CSS.escape()` (Baseline 2016) in browsers, with a regex fallback for Node/jsdom environments. `insertAdjacentElement`, `closest`, `querySelectorAll`, and `cloneNode` are all widely supported.

---

## License

MIT
