/* Match a short-lived visual handoff before the new page paints. Native links still work without it. */
(() => {
  try {
    const handoff=JSON.parse(sessionStorage.getItem('portfolio-yarn-handoff-v3')||'null');
    const preference=localStorage.getItem('portfolio-motion');
    const enabled=preference?preference==='on':!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(enabled&&handoff&&Date.now()-handoff.time<15000&&handoff.toPath===location.pathname){
      document.documentElement.classList.add('yarn-arriving');
      setTimeout(()=>document.documentElement.classList.remove('yarn-arriving'),1800);
    }
  } catch {}
})();
