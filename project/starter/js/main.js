/* ==========================================================================
   Your Site Name: main script
   Every page loads this file from its <head>:
     <script src="js/main.js" defer></script>
   "defer" makes the browser wait until the HTML is parsed before running
   this file, so the elements the code looks for already exist.
   ========================================================================== */

// Tell the CSS that JavaScript is running. The stylesheet only hides the
// navigation behind a menu button when <html> has class="js", so the links
// are never lost if this script fails to load.
document.documentElement.classList.add('js');


/* --------------------------------------------------------------------------
   Milestone 5 example: responsive navigation toggle
   The HTML button starts with aria-expanded="false". Clicking it flips that
   value (screen readers announce "expanded" or "collapsed") and adds or
   removes the "is-open" class that the CSS uses to show the menu.
   -------------------------------------------------------------------------- */
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('#site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    siteNav.classList.toggle('is-open', !isOpen);
  });

  // Close the open menu with the Escape key and return focus to the button.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('is-open');
      navToggle.focus();
    }
  });
}


/* --------------------------------------------------------------------------
   Milestone 5: YOUR JavaScript feature goes below this comment.

   Almost every feature follows the same three steps:
     1. Select the elements you need      document.querySelector('#id')
     2. Listen for an event               element.addEventListener('click', ...)
     3. Update the page                   textContent, classList, hidden, setAttribute

   Guard against pages that do not have your feature, like the nav code does:
     const list = document.querySelector('#pet-list');
     if (list) { ... }

   Write it yourself, comment what each part does, and be ready to explain
   every line. If you use an AI tool in any way, record it in the AI use log
   in your README.
   -------------------------------------------------------------------------- */
