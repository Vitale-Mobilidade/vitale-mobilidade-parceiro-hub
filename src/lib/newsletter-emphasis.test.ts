import {expect,it} from 'vitest';
import {newsletterEmphasis} from './newsletter';
it('renders short editorial emphasis while escaping external HTML',()=>{
 expect(newsletterEmphasis('A **V9 Max** tem **bateria removível**.')).toBe('A <strong>V9 Max</strong> tem <strong>bateria removível</strong>.');
 expect(newsletterEmphasis('**<img src=x onerror=alert(1)>**')).toBe('<strong>&lt;img src=x onerror=alert(1)&gt;</strong>');
 expect(newsletterEmphasis('**A** **B** **C** **D**')).toBe('<strong>A</strong> <strong>B</strong> <strong>C</strong> D');
});
