import type {Page} from '@playwright/test';
export async function mobileQuality(page:Page){
  return page.evaluate(()=>{
    const visible=(element:Element)=>{const r=element.getBoundingClientRect();const style=getComputedStyle(element);return r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&!element.closest('[aria-hidden="true"],.sr-only');};
    const text=[...document.querySelectorAll('p,a,button,label,input,textarea,small,li,span,pre,strong,output')].filter(element=>visible(element)&&([...element.childNodes].some(node=>node.nodeType===3&&node.textContent?.trim())||element.matches('input,textarea'))&&parseFloat(getComputedStyle(element).fontSize)<16).map(element=>`${element.tagName}.${element.className}: ${getComputedStyle(element).fontSize}`);
    const targets=[...document.querySelectorAll('a,button,input,textarea')].filter(element=>visible(element)&&!element.matches('input[type=file]')&&(element.getBoundingClientRect().width<43.9||element.getBoundingClientRect().height<43.9)).map(element=>`${element.tagName}.${element.className}: ${Math.round(element.getBoundingClientRect().width)}x${Math.round(element.getBoundingClientRect().height)} ${element.textContent?.trim().slice(0,32)}`);
    return {text,targets,overflow:document.documentElement.scrollWidth>innerWidth};
  });
}

