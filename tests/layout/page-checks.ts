// What the layout sweep asks of each page, written as a script that runs inside the page. It looks
// for the ways a screen breaks when the window changes size: the page scrolling sideways, a table
// scrolling sideways, a column heading not lined up with its figures, a button label split over two
// lines, a figure split over two lines, and text cut off. It returns a list of problems in words.

export const PAGE_CHECKS = `(() => {
  const problems = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 36);
  // How many lines a piece of text takes: boxes whose middles are less than about a line apart
  // are on the same line, so an icon beside text, or two boxes for one line, count once.
  const lines = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const boxes = [...range.getClientRects()]
      .filter((r) => r.width > 0)
      .map((r) => ({ middle: (r.top + r.bottom) / 2, height: r.height }))
      .sort((a, b) => a.middle - b.middle);
    let count = 0;
    let last = -Infinity;
    for (const box of boxes) {
      if (box.middle - last > box.height * 0.6) {
        count += 1;
        last = box.middle;
      }
    }
    return count;
  };

  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
    problems.push('the page scrolls sideways');
  }

  for (const box of document.querySelectorAll('.table-scroll')) {
    if (visible(box) && box.scrollWidth > box.clientWidth + 1) {
      const name = box.querySelector('table')?.getAttribute('aria-label') ?? 'a table';
      problems.push('the table "' + name + '" scrolls sideways');
    }
  }

  for (const table of document.querySelectorAll('table')) {
    if (!visible(table)) continue;
    const name = table.getAttribute('aria-label') ?? 'a table';
    const heads = [...table.querySelectorAll('thead th')];
    const row = [...table.querySelectorAll('tbody tr')].find((tr) => !tr.classList.contains('table__group') && tr.querySelectorAll('td').length === heads.length);
    if (!row) continue;
    const cells = [...row.querySelectorAll('td')];
    heads.forEach((th, i) => {
      const head = getComputedStyle(th).textAlign;
      const cell = getComputedStyle(cells[i]).textAlign;
      if (head !== cell) problems.push('in "' + name + '" the heading "' + label(th) + '" is aligned ' + head + ' but its figures are aligned ' + cell);
    });
  }

  for (const el of document.querySelectorAll('button, .button')) {
    if (visible(el) && lines(el) > 1) problems.push('the button "' + label(el) + '" is split over two lines');
  }
  for (const el of document.querySelectorAll('.amount')) {
    if (visible(el) && lines(el) > 1) problems.push('the figure "' + label(el) + '" is split over two lines');
  }

  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const box = el.getBoundingClientRect();
    // Text meant for a screen reader only is a box of one pixel, cut off on purpose.
    if (box.width <= 2 || box.height <= 2) continue;
    const cs = getComputedStyle(el);
    const scrolls = ['auto', 'scroll'].includes(cs.overflowX);
    if (!scrolls && (cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      problems.push('the text "' + label(el) + '" is cut off');
    }
  }
  return problems;
})()`;
