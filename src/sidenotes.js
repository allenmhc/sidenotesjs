/**
 * sidenotesjs — Convert Markdown footnotes into inline sidenotes. No jQuery required.
 * Faithful rewrite of https://github.com/acdlite/jquery.sidenotes
 */

// CSS selector escaping: native CSS.escape in browsers, regex fallback for Node/jsdom
function cssEscape(str) {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(str);
  }
  return str.replace(/(["#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~!])/g, '\\$1');
}

// Walk up the DOM tree from el until its parent is container, then return that child.
// Equivalent to jQuery's $(el).parentsUntil(container).last()
function getLastAncestorBefore(el, container) {
  let current = el;
  while (current && current.parentElement !== container) {
    current = current.parentElement;
  }
  return current && current.parentElement === container ? current : null;
}

const DEFAULTS = {
  footnoteContainer: '.footnotes',
  footnoteElement: 'li',
  footnoteBacklinkSelector: 'a',
  removeRefMarkRegex: false,
  initiallyHidden: false,
  sidenotePlacement: 'before',
  sidenoteElement: 'aside',
  sidenoteClass: 'sidenote',
  sidenoteGroupElement: 'section',
  sidenoteGroupClass: 'sidenoteGroup',
  // Custom show/hide — receive the DOM element to toggle
  show: (el) => { el.style.display = ''; },
  hide: (el) => { el.style.display = 'none'; },
  // Override to customize the generated sidenote element.
  // Receives (footnoteHTML, sidenoteID, ref) where ref is the 1-based counter (or null).
  formatSidenote: null,
};

// ---------------------------------------------------------------------------
// Sidenote — represents a single converted footnote
// ---------------------------------------------------------------------------
class Sidenote {
  constructor(footnoteEl, ref, owner) {
    this.footnoteEl = footnoteEl;
    this.ref = ref;
    this.owner = owner;
    this.group = null;

    const opts = owner.options;
    this.footnoteID = footnoteEl.id;
    // Derive sidenote ID: fn:1 → sn:1, fn-1 → sn-1
    this.sidenoteID = this.footnoteID.replace(/^fn/, 'sn');

    // Find the anchor in the post body that links to this footnote
    this.refMarkAnchor = owner.postContainer.querySelector(
      `a[href="#${cssEscape(this.footnoteID)}"]`
    );

    if (!this.refMarkAnchor) {
      console.warn(`[sidenotes] No reference anchor found for footnote #${this.footnoteID}`);
      this.refMarkSup = null;
      this.isNested = false;
      this.referringSidenote = null;
      this.pivot = null;
      this.sidenoteEl = opts.formatSidenote(footnoteEl.innerHTML, this.sidenoteID, ref);
      opts.hide(this.sidenoteEl);
      return;
    }

    // The reference mark is the <sup> wrapping the anchor (if present)
    this.refMarkSup = this.refMarkAnchor.closest('sup');

    // A footnote is "nested" if its reference mark is inside the footnote container
    // (i.e., one footnote references another)
    this.isNested = owner.footnoteContainerEl.contains(this._refMark());

    if (this.isNested) {
      // Find the footnote <li> that contains the nested reference mark
      const parentLi = this._refMark().closest(opts.footnoteElement);
      this.referringSidenote = parentLi
        ? owner.sidenotes.find(sn => sn.footnoteEl === parentLi) ?? null
        : null;
      // Inherit the pivot from the parent sidenote
      this.pivot = this.referringSidenote ? this.referringSidenote.pivot : null;
    } else {
      this.referringSidenote = null;
      // The pivot is the direct child of postContainer that contains refMark
      this.pivot = getLastAncestorBefore(this._refMark(), owner.postContainer);
    }

    // Build the sidenote DOM element
    this.sidenoteEl = opts.formatSidenote(footnoteEl.innerHTML, this.sidenoteID, ref);

    // Find the backlink (↩) inside the cloned sidenote content
    const refMarkEl = this._refMark();
    if (refMarkEl && refMarkEl.id) {
      this.backlinkEl = this.sidenoteEl.querySelector(
        `a[href="#${cssEscape(refMarkEl.id)}"]`
      );
    } else {
      this.backlinkEl = null;
    }

    // Start hidden; the Sidenotes coordinator calls show() when ready
    opts.hide(this.sidenoteEl);
  }

  // Returns the <sup> element if present, otherwise the <a> anchor
  _refMark() {
    return this.refMarkSup ?? this.refMarkAnchor;
  }

  hasGroup() {
    return this.group !== null;
  }

  show() {
    // Update the in-text reference link to point to this sidenote
    if (this.refMarkAnchor) {
      this.refMarkAnchor.setAttribute('href', `#${this.sidenoteID}`);
    }
    // Only manage visibility directly if not in a group (group handles it)
    if (!this.hasGroup()) {
      this.owner.options.show(this.sidenoteEl);
    }
  }

  hide() {
    // Restore the in-text reference link to the original footnote
    if (this.refMarkAnchor) {
      this.refMarkAnchor.setAttribute('href', `#${this.footnoteID}`);
    }
    if (!this.hasGroup()) {
      this.owner.options.hide(this.sidenoteEl);
    }
  }
}

// ---------------------------------------------------------------------------
// SidenoteGroup — wraps multiple sidenotes that share the same pivot
// ---------------------------------------------------------------------------
class SidenoteGroup {
  constructor(initialSidenotes, owner) {
    this.owner = owner;
    this.sidenotes = [];
    this.pivot = initialSidenotes[0].pivot;

    const opts = owner.options;
    this.groupEl = document.createElement(opts.sidenoteGroupElement);
    this.groupEl.className = opts.sidenoteGroupClass;

    for (const sn of initialSidenotes) {
      this.sidenotes.push(sn);
      this.groupEl.appendChild(sn.sidenoteEl);
      // Remove individual hide — the group element controls overall visibility
      opts.show(sn.sidenoteEl);
      sn.group = this;
    }

    // Group starts hidden; Sidenotes.show() will reveal it
    opts.hide(this.groupEl);
  }

  push(sidenote) {
    this.sidenotes.push(sidenote);
    this.groupEl.appendChild(sidenote.sidenoteEl);
    this.owner.options.show(sidenote.sidenoteEl);
    sidenote.group = this;
  }

  show() {
    this.owner.options.show(this.groupEl);
  }

  hide() {
    this.owner.options.hide(this.groupEl);
  }
}

// ---------------------------------------------------------------------------
// Sidenotes — public API class
// ---------------------------------------------------------------------------
class Sidenotes {
  /**
   * @param {Element} element  The container element (e.g. article.post)
   * @param {object}  options  Configuration overrides
   */
  constructor(element, options = {}) {
    this.postContainer = element;
    this.options = Object.assign({}, DEFAULTS, options);
    this.isHidden = false;

    // Default formatSidenote: create an <aside> with the footnote's HTML
    if (!this.options.formatSidenote) {
      this.options.formatSidenote = (html, id /*, ref */) => {
        const el = document.createElement(this.options.sidenoteElement);
        el.className = this.options.sidenoteClass;
        el.id = id;
        el.innerHTML = html;
        return el;
      };
    }

    this.footnoteContainerEl = element.querySelector(this.options.footnoteContainer);
    if (!this.footnoteContainerEl) {
      console.warn(
        `[sidenotes] Footnote container "${this.options.footnoteContainer}" not found in`,
        element
      );
      this.sidenotes = [];
      this.groups = [];
      return;
    }

    const footnoteEls = Array.from(
      this.footnoteContainerEl.querySelectorAll(this.options.footnoteElement)
    );

    this.sidenotes = [];
    this.groups = [];

    let refCounter = 0;
    for (const footnoteEl of footnoteEls) {
      const hasRef = !(
        this.options.removeRefMarkRegex &&
        this.options.removeRefMarkRegex.test(footnoteEl.id)
      );
      const ref = hasRef ? ++refCounter : null;
      const sn = new Sidenote(footnoteEl, ref, this);
      this.sidenotes.push(sn);

      // Group consecutive sidenotes that share the same pivot
      if (this.sidenotes.length >= 2 && sn.pivot !== null) {
        const prev = this.sidenotes[this.sidenotes.length - 2];
        if (prev.pivot !== null && prev.pivot === sn.pivot) {
          if (prev.hasGroup()) {
            prev.group.push(sn);
          } else {
            const group = new SidenoteGroup([prev, sn], this);
            this.groups.push(group);
          }
        }
      }
    }

    // Insert all sidenote/group elements into the DOM
    this._insertAll();

    if (this.options.initiallyHidden) {
      this.isHidden = true;
      // Sidenotes are already hidden (from their constructors).
      // Leave the footnote container visible.
    } else {
      this.show();
    }
  }

  _positionAttr() {
    return this.options.sidenotePlacement === 'before' ? 'beforebegin' : 'afterend';
  }

  _insertAll() {
    const pos = this._positionAttr();
    for (const sn of this.sidenotes) {
      if (!sn.hasGroup() && sn.pivot) {
        sn.pivot.insertAdjacentElement(pos, sn.sidenoteEl);
      }
    }
    for (const group of this.groups) {
      if (group.pivot) {
        group.pivot.insertAdjacentElement(pos, group.groupEl);
      }
    }
  }

  /**
   * Show all sidenotes and hide the original footnote container.
   */
  show() {
    this.isHidden = false;
    for (const sn of this.sidenotes) {
      sn.show();
    }
    for (const group of this.groups) {
      group.show();
    }
    this.options.hide(this.footnoteContainerEl);
  }

  /**
   * Hide all sidenotes and restore the original footnote container.
   */
  hide() {
    this.isHidden = true;
    for (const sn of this.sidenotes) {
      sn.hide();
    }
    for (const group of this.groups) {
      group.hide();
    }
    this.options.show(this.footnoteContainerEl);
  }

  /**
   * Get or set the sidenote placement relative to the pivot element.
   * @param {'before'|'after'} [value]
   * @returns {string|undefined} Current placement when called with no argument
   */
  placement(value) {
    if (value === undefined) return this.options.sidenotePlacement;
    this.options.sidenotePlacement = value;
    const pos = this._positionAttr();
    for (const sn of this.sidenotes) {
      if (!sn.hasGroup() && sn.pivot) {
        sn.pivot.insertAdjacentElement(pos, sn.sidenoteEl);
      }
    }
    for (const group of this.groups) {
      if (group.pivot) {
        group.pivot.insertAdjacentElement(pos, group.groupEl);
      }
    }
  }

  /**
   * Alias for placement() — matches original jquery.sidenotes API.
   */
  sidenotePlacement(value) {
    return this.placement(value);
  }

  /**
   * Remove all generated sidenote elements and restore the original DOM.
   */
  destroy() {
    for (const sn of this.sidenotes) {
      if (!sn.hasGroup() && sn.sidenoteEl.parentElement) {
        sn.sidenoteEl.remove();
      }
      if (sn.refMarkAnchor) {
        sn.refMarkAnchor.setAttribute('href', `#${sn.footnoteID}`);
      }
    }
    for (const group of this.groups) {
      if (group.groupEl.parentElement) {
        group.groupEl.remove();
      }
    }
    this.options.show(this.footnoteContainerEl);
  }
}

export default Sidenotes;
