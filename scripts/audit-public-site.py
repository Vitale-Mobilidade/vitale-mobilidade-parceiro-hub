"""Read-only SSR audit; four concurrent requests, raw HTML and per-URL evidence."""
import concurrent.futures
import gzip
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.links, self.images, self.schemas = {}, [], [], []
        self.title, self.headings, self.text = '', [], []
        self.capture, self.buffer, self.hidden, self.in_article = None, [], 0, False
        self.article_text = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'article': self.in_article = True
        if tag == 'meta': self.meta.setdefault(a.get('name', a.get('property', '')), []).append(a.get('content', ''))
        if tag == 'link' and a.get('rel') == 'canonical': self.meta.setdefault('canonical', []).append(a.get('href', ''))
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'img': self.images.append(a)
        if tag in ('script', 'style'): self.hidden += 1
        if tag in ('title', 'h1', 'h2', 'h3') or (tag == 'script' and a.get('type') == 'application/ld+json'):
            self.capture, self.buffer = tag, []

    def handle_data(self, data):
        if self.capture: self.buffer.append(data)
        if not self.hidden:
            self.text.append(data)
            if self.in_article: self.article_text.append(data)

    def handle_endtag(self, tag):
        if tag == self.capture:
            value = ''.join(self.buffer).strip()
            if tag == 'title': self.title = value
            elif tag == 'script':
                try: self.schemas.extend(json.loads(value) if value.startswith('[') else [json.loads(value)])
                except ValueError: self.schemas.append({'invalidJson': True})
            else: self.headings.append({'level': tag, 'text': value})
            self.capture = None
        if tag in ('script', 'style'): self.hidden = max(0, self.hidden - 1)
        if tag == 'article': self.in_article = False


def request(url, agent='Vitale-public-audit/1.0'):
    req = urllib.request.Request(url, headers={'User-Agent': agent, 'Accept-Encoding': 'gzip'})
    start = time.monotonic()
    try: response = urllib.request.urlopen(req, timeout=35)
    except urllib.error.HTTPError as e: response = e
    data = response.read()
    encoded_bytes = len(data)
    if response.headers.get('Content-Encoding') == 'gzip': data = gzip.decompress(data)
    headers = {k: v for k, v in response.headers.items() if k.lower() != 'set-cookie'}
    return response.status, response.geturl(), headers, data, encoded_bytes, round((time.monotonic()-start)*1000)


def audit(url):
    try:
        status, final, headers, data, wire, elapsed = request(url)
        key = hashlib.sha256(url.encode()).hexdigest()[:16]
        (OUT / 'html' / (key+'.html')).write_bytes(data)
        doc = Document()
        doc.feed(data.decode('utf8', errors='replace'))
        article = '/conteudos/' in urllib.parse.urlparse(url).path
        checks = []
        if status != 200: checks.append('http_'+str(status))
        if final != url: checks.append('redirect_in_sitemap')
        if not doc.title: checks.append('missing_title')
        for field in ('description', 'canonical', 'og:title', 'og:description', 'og:image', 'og:url'):
            if not doc.meta.get(field) or not all(doc.meta[field]): checks.append('missing_'+field)
            elif len(doc.meta[field]) != 1: checks.append('duplicate_'+field)
        expected_canonical = CANONICAL_ORIGIN + urllib.parse.urlparse(url).path
        if doc.meta.get('canonical') != [expected_canonical]: checks.append('wrong_canonical')
        if any('noindex' in x for x in doc.meta.get('robots', [])): checks.append('noindex_in_sitemap')
        if len([h for h in doc.headings if h['level']=='h1']) != 1: checks.append('h1_count')
        if any(s.get('invalidJson') for s in doc.schemas): checks.append('invalid_jsonld')
        schemas = [s for s in doc.schemas if isinstance(s, dict)]
        if article:
            a = next((s for s in schemas if s.get('@type')=='Article'), {})
            for field in ('headline','datePublished','author','image','mainEntityOfPage'):
                if not a.get(field): checks.append('article_missing_'+field)
            if len(' '.join(doc.article_text).strip()) < 200: checks.append('article_not_in_ssr')
        internal = sorted({urllib.parse.urljoin(url, h).split('#')[0].split('?')[0] for h in doc.links if urllib.parse.urlparse(urllib.parse.urljoin(url,h)).netloc == urllib.parse.urlparse(url).netloc})
        return {'url':url,'status':status,'finalUrl':final,'elapsedMs':elapsed,'htmlBytes':len(data),'wireBytes':wire,'headers':headers,'htmlFile':'html/'+key+'.html','title':doc.title,'meta':doc.meta,'headings':doc.headings,'schemas':schemas,'images':doc.images,'internalLinks':internal,'articleText':' '.join(doc.article_text),'issues':checks}
    except Exception as e: return {'url':url,'issues':['request_failed'],'error':str(e)}


if __name__ == '__main__':
    ORIGIN = sys.argv[1] if len(sys.argv)>1 else 'https://vitalemobilidade.com'
    CANONICAL_ORIGIN = sys.argv[3] if len(sys.argv)>3 else ORIGIN
    OUT = Path(sys.argv[2] if len(sys.argv)>2 else 'artifacts/seo-final-2026-09-29')
    (OUT/'html').mkdir(parents=True,exist_ok=True)
    status, _, headers, xml, _, _ = request(ORIGIN+'/sitemap.xml')
    (OUT/'sitemap.xml').write_bytes(xml)
    urls = [ORIGIN + urllib.parse.urlparse(e.text).path for e in ET.fromstring(xml).iter() if e.tag.endswith('}loc')]
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for i, row in enumerate(pool.map(audit,urls)):
            results.append(row)
            if (i+1)%20==0: print(f'{i+1}/{len(urls)} URLs audited',flush=True)
    robots = request(ORIGIN+'/robots.txt')[3].decode()
    summary = {'origin':ORIGIN,'sitemapStatus':status,'sitemapHeaders':headers,'urlCount':len(urls),'articleCount':sum('/conteudos/' in u for u in urls),'issues':dict(Counter(issue for r in results for issue in r['issues'])),'robots':robots}
    (OUT/'crawl.json').write_text(json.dumps({'summary':summary,'pages':results},ensure_ascii=False,indent=2))
    print(json.dumps(summary,ensure_ascii=False,indent=2))
