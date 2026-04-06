import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { describe, it, beforeEach, expect } from 'vitest';
import Sidenotes from '../src/sidenotes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(__dirname, 'fixtures', 'test.html'), 'utf-8');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Re-initialize document with the standard fixture */
function resetFixture() {
  document.body.innerHTML = fixture;
}

/** Get the article element */
function post() {
  return document.querySelector('.post');
}

/** Shorthand querySelector */
function $(sel, root = document) {
  return root.querySelector(sel);
}

function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

// ---------------------------------------------------------------------------
// Main test suite
// ---------------------------------------------------------------------------

describe('Sidenotes', () => {
  let sn;

  beforeEach(() => {
    resetFixture();
    sn = new Sidenotes(post());
  });

  // -------------------------------------------------------------------------
  describe('Initialization', () => {
    it('creates one sidenote per footnote', () => {
      expect($$('.sidenote').length).toBe(3);
    });

    it('groups sidenotes that share the same pivot element', () => {
      expect($$('.sidenoteGroup').length).toBe(1);
    });

    it('places all footnotes from the same paragraph into a single group', () => {
      const group = $('.sidenoteGroup');
      expect($$('.sidenote', group).length).toBe(2);
    });

    it('hides the footnote container', () => {
      expect($('.footnotes').style.display).toBe('none');
    });

    it('inserts sidenotes adjacent to their pivot by default (before)', () => {
      const p1 = document.getElementById('p1');
      const aside = document.getElementById('sn:1');
      // With placement='before', the sidenote precedes the pivot
      expect(aside).not.toBeNull();
      expect(aside.nextElementSibling).toBe(p1);
    });

    it('inserts the group adjacent to the grouped pivot (before)', () => {
      const p2 = document.getElementById('p2');
      const group = $('.sidenoteGroup');
      expect(group.nextElementSibling).toBe(p2);
    });

    it('sets sidenote id derived from footnote id', () => {
      expect(document.getElementById('sn:1')).not.toBeNull();
      expect(document.getElementById('sn:2')).not.toBeNull();
      expect(document.getElementById('sn:3')).not.toBeNull();
    });

    it('applies the sidenoteClass to each sidenote element', () => {
      const asides = $$('aside.sidenote');
      expect(asides.length).toBe(3);
    });

    it('applies the sidenoteGroupClass to the group element', () => {
      expect($('.sidenoteGroup')).not.toBeNull();
    });

    it('updates refMarkAnchor href to point to the sidenote', () => {
      const anchor = document.getElementById('fnref:1').querySelector('a');
      expect(anchor.getAttribute('href')).toBe('#sn:1');
    });

    it('sets isHidden to false', () => {
      expect(sn.isHidden).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('#hide()', () => {
    beforeEach(() => {
      sn.hide();
    });

    it('hides ungrouped sidenotes', () => {
      const aside = document.getElementById('sn:1');
      expect(aside.style.display).toBe('none');
    });

    it('hides grouped sidenotes via the group element', () => {
      const group = $('.sidenoteGroup');
      expect(group.style.display).toBe('none');
    });

    it('shows the footnote container', () => {
      expect($('.footnotes').style.display).toBe('');
    });

    it('restores refMarkAnchor href to the original footnote', () => {
      const anchor = document.getElementById('fnref:1').querySelector('a');
      expect(anchor.getAttribute('href')).toBe('#fn:1');
    });

    it('sets isHidden to true', () => {
      expect(sn.isHidden).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('#show()', () => {
    beforeEach(() => {
      sn.hide();
      sn.show();
    });

    it('shows ungrouped sidenotes', () => {
      const aside = document.getElementById('sn:1');
      expect(aside.style.display).toBe('');
    });

    it('shows the group element', () => {
      const group = $('.sidenoteGroup');
      expect(group.style.display).toBe('');
    });

    it('hides the footnote container', () => {
      expect($('.footnotes').style.display).toBe('none');
    });

    it('updates refMarkAnchor href back to the sidenote', () => {
      const anchor = document.getElementById('fnref:1').querySelector('a');
      expect(anchor.getAttribute('href')).toBe('#sn:1');
    });

    it('sets isHidden to false', () => {
      expect(sn.isHidden).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('#placement()', () => {
    it('returns current placement when called with no argument', () => {
      expect(sn.placement()).toBe('before');
    });

    it("places sidenotes before their pivot when set to 'before'", () => {
      sn.placement('before');
      const p1 = document.getElementById('p1');
      const aside = document.getElementById('sn:1');
      expect(aside.nextElementSibling).toBe(p1);
    });

    it("places sidenotes after their pivot when set to 'after'", () => {
      sn.placement('after');
      const p1 = document.getElementById('p1');
      const aside = document.getElementById('sn:1');
      expect(p1.nextElementSibling).toBe(aside);
    });

    it('repositions groups when placement changes', () => {
      sn.placement('after');
      const p2 = document.getElementById('p2');
      const group = $('.sidenoteGroup');
      expect(p2.nextElementSibling).toBe(group);
    });

    it('sidenotePlacement() is an alias for placement()', () => {
      sn.sidenotePlacement('after');
      expect(sn.placement()).toBe('after');
    });
  });

  // -------------------------------------------------------------------------
  describe('#destroy()', () => {
    beforeEach(() => {
      sn.destroy();
    });

    it('removes all sidenote elements from the DOM', () => {
      expect($$('.sidenote').length).toBe(0);
    });

    it('removes all sidenote group elements from the DOM', () => {
      expect($$('.sidenoteGroup').length).toBe(0);
    });

    it('shows the footnote container', () => {
      expect($('.footnotes').style.display).toBe('');
    });

    it('restores refMarkAnchor href to original footnote', () => {
      const anchor = document.getElementById('fnref:1').querySelector('a');
      expect(anchor.getAttribute('href')).toBe('#fn:1');
    });
  });

  // -------------------------------------------------------------------------
  describe('Options', () => {
    it('initiallyHidden: true — sidenotes are in the DOM but hidden', () => {
      resetFixture();
      new Sidenotes(post(), { initiallyHidden: true });
      const aside = document.getElementById('sn:1');
      expect(aside).not.toBeNull(); // still in DOM
      expect(aside.style.display).toBe('none');
    });

    it('initiallyHidden: true — footnote container remains visible', () => {
      resetFixture();
      new Sidenotes(post(), { initiallyHidden: true });
      expect($('.footnotes').style.display).toBe('');
    });

    it('initiallyHidden: true — isHidden is true', () => {
      resetFixture();
      const instance = new Sidenotes(post(), { initiallyHidden: true });
      expect(instance.isHidden).toBe(true);
    });

    it("sidenotePlacement: 'after' inserts sidenotes after their pivot", () => {
      resetFixture();
      new Sidenotes(post(), { sidenotePlacement: 'after' });
      const p1 = document.getElementById('p1');
      const aside = document.getElementById('sn:1');
      expect(p1.nextElementSibling).toBe(aside);
    });

    it('removeRefMarkRegex: skips ref counter for matching footnotes', () => {
      resetFixture();
      // Match fn:2 — its sidenote should have ref=null (not counted)
      new Sidenotes(post(), { removeRefMarkRegex: /fn:2/ });
      // fn:1 is ref 1, fn:2 is skipped, fn:3 is ref 2 — sidenotes still created
      expect($$('.sidenote').length).toBe(3);
    });

    it('sidenoteElement: uses a custom HTML tag for sidenotes', () => {
      resetFixture();
      new Sidenotes(post(), { sidenoteElement: 'div' });
      expect($$('div.sidenote').length).toBe(3);
      expect($$('aside.sidenote').length).toBe(0);
    });

    it('sidenoteClass: applies a custom CSS class', () => {
      resetFixture();
      new Sidenotes(post(), { sidenoteClass: 'marginnote' });
      expect($$('.marginnote').length).toBe(3);
    });

    it('sidenoteGroupElement: uses a custom HTML tag for groups', () => {
      resetFixture();
      new Sidenotes(post(), { sidenoteGroupElement: 'div' });
      expect($('div.sidenoteGroup')).not.toBeNull();
    });

    it('sidenoteGroupClass: applies a custom CSS class to groups', () => {
      resetFixture();
      new Sidenotes(post(), { sidenoteGroupClass: 'note-cluster' });
      expect($('.note-cluster')).not.toBeNull();
    });

    it('footnoteContainer: finds footnotes using a custom selector', () => {
      resetFixture();
      // Rename the container class in the DOM
      const fn = $('.footnotes');
      fn.className = 'endnotes';
      new Sidenotes(post(), { footnoteContainer: '.endnotes' });
      expect($$('.sidenote').length).toBe(3);
    });

    it('footnoteElement: finds footnotes using a custom element selector', () => {
      resetFixture();
      // Swap <li> for <p> in the footnote list
      document.body.innerHTML = `
        <article class="post">
          <p id="p1">Text<sup id="fnref:1"><a href="#fn:1">1</a></sup></p>
          <div class="footnotes">
            <p id="fn:1">Custom element footnote. <a href="#fnref:1">&#8617;</a></p>
          </div>
        </article>`;
      new Sidenotes(post(), { footnoteElement: 'p' });
      expect($$('.sidenote').length).toBe(1);
    });

    it('custom show/hide callbacks are invoked instead of style.display', () => {
      resetFixture();
      const shown = [];
      const hidden = [];
      new Sidenotes(post(), {
        show: (el) => shown.push(el),
        hide: (el) => hidden.push(el),
      });
      // hide() called on: 3 sidenoteEls (in constructor), 1 groupEl, 1 footnoteContainer
      // show() called on: 2 sidenoteEls inside group (when added), then show() on ungrouped + groups + hide(footnoteContainer)
      expect(shown.length).toBeGreaterThan(0);
      expect(hidden.length).toBeGreaterThan(0);
    });

    it('formatSidenote: uses a custom function to build sidenote elements', () => {
      resetFixture();
      new Sidenotes(post(), {
        formatSidenote: (html, id) => {
          const el = document.createElement('div');
          el.className = 'custom-note';
          el.id = id;
          el.innerHTML = html;
          return el;
        },
      });
      expect($$('.custom-note').length).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  describe('Nested footnotes', () => {
    beforeEach(() => {
      // Build a fixture where fn:2 is referenced inside fn:1 (nested)
      document.body.innerHTML = `
        <article class="post">
          <p id="p1">Text<sup id="fnref:1"><a href="#fn:1">1</a></sup></p>
          <div class="footnotes">
            <ol>
              <li id="fn:1">Parent footnote with nested ref.<sup id="fnref:2"><a href="#fn:2">2</a></sup> <a href="#fnref:1">&#8617;</a></li>
              <li id="fn:2">Nested footnote content. <a href="#fnref:2">&#8617;</a></li>
            </ol>
          </div>
        </article>`;
      sn = new Sidenotes(post());
    });

    it('creates sidenotes for both parent and nested footnotes', () => {
      expect($$('.sidenote').length).toBe(2);
    });

    it('assigns the same pivot to a nested footnote as its parent', () => {
      const p1 = document.getElementById('p1');
      // fn:2 is nested inside fn:1 → pivot should be p1 (same as fn:1)
      const fn2sn = sn.sidenotes.find(s => s.footnoteID === 'fn:2');
      expect(fn2sn.pivot).toBe(p1);
    });

    it('marks nested sidenotes as isNested', () => {
      const fn2sn = sn.sidenotes.find(s => s.footnoteID === 'fn:2');
      expect(fn2sn.isNested).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('warns and skips gracefully when a footnote has no reference in the body', () => {
      document.body.innerHTML = `
        <article class="post">
          <p id="p1">No refs here.</p>
          <div class="footnotes">
            <ol>
              <li id="fn:1">Orphaned footnote. <a href="#fnref:1">&#8617;</a></li>
            </ol>
          </div>
        </article>`;
      // Should not throw
      expect(() => new Sidenotes(post())).not.toThrow();
    });

    it('handles an empty footnote container gracefully', () => {
      document.body.innerHTML = `
        <article class="post">
          <p id="p1">Text.</p>
          <div class="footnotes"><ol></ol></div>
        </article>`;
      const instance = new Sidenotes(post());
      expect(instance.sidenotes.length).toBe(0);
    });

    it('warns and returns early when footnote container is not found', () => {
      document.body.innerHTML = `
        <article class="post"><p>No footnotes container.</p></article>`;
      const instance = new Sidenotes(post());
      expect(instance.sidenotes.length).toBe(0);
    });

    it('can call show() and hide() on an instance with no sidenotes', () => {
      document.body.innerHTML = `
        <article class="post">
          <p>No refs.</p>
          <div class="footnotes"><ol></ol></div>
        </article>`;
      const instance = new Sidenotes(post());
      expect(() => { instance.hide(); instance.show(); }).not.toThrow();
    });

    it('can call destroy() safely after already being destroyed', () => {
      sn.destroy();
      expect(() => sn.destroy()).not.toThrow();
    });
  });
});
