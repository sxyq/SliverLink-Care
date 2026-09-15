import { createElement } from 'react';

function toDomProps(props = {}) {
  const next = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') {
      next.className = value;
    } else if (['onClick', 'onTap', 'onInput', 'catchMove', 'loading', 'password', 'checked', 'value', 'disabled'].includes(key)) {
      // unit render: skip interactive/form props that trigger DOM warnings
    } else if (key === 'children') {
      // handled below
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      next[key === 'maxlength' ? 'maxLength' : key] = value;
    }
  }
  return next;
}

function createHostComponent(tag) {
  return function HostComponent(props) {
    const { children, ...rest } = props || {};
    return createElement(tag, toDomProps(rest), children);
  };
}

export const View = createHostComponent('div');
export const Text = createHostComponent('span');
export const Button = createHostComponent('button');
export const Input = createHostComponent('input');
export const Image = createHostComponent('img');
export const ScrollView = createHostComponent('div');
export const Picker = createHostComponent('div');
export const Checkbox = createHostComponent('input');
export const Label = createHostComponent('label');
export const Form = createHostComponent('form');

export function renderToStaticMarkup(element) {
  return null;
}
