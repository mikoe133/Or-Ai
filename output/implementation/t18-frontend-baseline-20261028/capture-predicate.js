// CUA REPL browser function, used through Runtime.evaluate; the static series also waits for finite CSS animations to finish before screenshots.
var waitExactT18 = function(path, isAdmin, name) {
  return new Promise(resolve => {
    const start = performance.now();
    function check() {
      const heading = [...document.querySelectorAll('h1')].find(h => h.textContent.trim() === name && getComputedStyle(h).visibility === 'visible' && !h.closest('[inert]'));
      const body = document.body?.innerText || '';
      if (location.pathname === path && heading && !document.querySelector('.ux-loading,.access-screen') && (!isAdmin || body.includes('需要管理员账户'))) {
        document.fonts.ready.then(function() {
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              resolve({ready:true,title:document.title,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},documentWidth:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('h1,h2,h3')].map(h=>({level:h.tagName,text:h.textContent})),main:[...document.querySelectorAll('main')].map(m=>({id:m.id,width:m.clientWidth,scrollWidth:m.scrollWidth,height:m.clientHeight,scrollHeight:m.scrollHeight})),text:document.body.innerText,probePresent:typeof window.__oraiPerformance!=='undefined'});
            });
          });
        });
      } else if (performance.now()-start>10000) resolve({ready:false,text:body});
      else setTimeout(check,30);
    }
    check();
  });
};
