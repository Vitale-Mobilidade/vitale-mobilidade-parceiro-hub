/** Queue events immediately; give the initial document a paint before fetching tags. */
export const GTM_SNIPPET = `if (!location.pathname.startsWith('/admin')) (function(w,d,s,l,i){
w[l]=w[l]||[];w.gtag=w.gtag||function(){w[l].push(arguments)};
w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var started=false;function boot(){if(started)return;started=true;
var j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;d.head.appendChild(j);}
var scheduled=false;function afterLoad(){if(scheduled)return;scheduled=true;
if(w.requestAnimationFrame)w.requestAnimationFrame(function(){w.requestAnimationFrame(function(){
if(w.requestIdleCallback)w.requestIdleCallback(boot,{timeout:1500});else boot();});});else boot();}
w.addEventListener('pointerdown',boot,{once:true,passive:true});w.addEventListener('keydown',boot,{once:true});
if(d.readyState==='complete')afterLoad();else w.addEventListener('load',afterLoad,{once:true});
})(window,document,'script','dataLayer','GTM-NM9MGXNM');`;
