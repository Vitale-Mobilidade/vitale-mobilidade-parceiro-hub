/** Progressive email enhancement. Inline light colors remain the fallback for clients that strip CSS. */
export function newsletterColorScheme(html: string) {
  const css = `:root{color-scheme:light dark;supported-color-schemes:light dark}
@media (prefers-color-scheme: dark){
body{background:#101814!important;color:#e4eee7!important}
table[style*="background:white"]{background:#17251e!important}
[bgcolor="#edf4ee"],[bgcolor="#f2f7f4"]{background:#22382b!important}
[bgcolor="#173d2a"]{background:#102c1d!important;color:#e4eee7!important}
h1,h2,h3{color:#edf5ef!important}
a{color:#8cdbb8!important}
[style*="color:#476756"],[style*="color:#526658"]{color:#bfd0c4!important}
[style*="color:#173d2a"]{color:#edf5ef!important}
[style*="color:#165b42"]{color:#8cdbb8!important}
[style*="background:#e6f0e8"]{background:#173d2a!important;color:#d1f5df!important}
[style*="background:#d6f5e6"]{background:#284f3b!important;color:#d1f5df!important}
[bgcolor="#165b42"]{background:#216b4f!important}
[bgcolor="#165b42"] a,[bgcolor="#173d2a"] a{color:#ffffff!important}
img[style*="background:#ffffff"]{background:#ffffff!important}
[style*="border-top:1px solid #e0e8e2"],[style*="border:1px solid #e0e8e2"]{border-color:#496354!important}
}`;
  return html.replace(
    "</head>",
    `<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>${css}</style></head>`,
  );
}

export function previewTheme(html: string, dark: boolean) {
  return html.replace(
    /@media\s*\(prefers-color-scheme:\s*dark\)/g,
    dark ? "@media all" : "@media not all",
  );
}
