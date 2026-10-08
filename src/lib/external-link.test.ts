import { expect, it } from 'vitest';
import { externalLinkProps } from './external-link';
it('mantém navegação interna e protege abertura de destinos externos', () => {
  for (const url of ['/radar/v9_max', '#newsletter', 'https://vitalemobilidade.com/videos', 'mailto:lucasvitale@hotmail.com']) expect(externalLinkProps(url)).toEqual({});
  for (const url of ['https://www.youtube.com/@vitalemobilidade', '//www.instagram.com/vitalemobilidade/', 'https://vitalemobilidade.com.example.org/']) expect(externalLinkProps(url)).toEqual({ target: '_blank', rel: 'noopener noreferrer' });
});
