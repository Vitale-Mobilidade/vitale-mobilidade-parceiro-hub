/** Start the public analytics container on the initial document load. */
export const GTM_SNIPPET = `if (!location.pathname.startsWith('/admin')) (function(w,d,s,l,i){
w[l]=w[l]||[];w.gtag=w.gtag||function(){w[l].push(arguments)};
w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;d.head.appendChild(j);
})(window,document,'script','dataLayer','GTM-NM9MGXNM');`;
