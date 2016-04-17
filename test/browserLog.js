/* eslint-disable no-console */

if (location.search !== '?raw') {
  const colors = {
    number: 'blue',
    string: 'darkgreen',
    object: 'darkorange',
  };
  const oc = console.log;
  console.log = (...toLog) => {
    oc.apply(console, toLog);
    const div = document.createElement('section');
    for (const l of toLog) {
      const p = document.createElement('pre');
      p.style.color = colors[typeof l];
      p.appendChild(document.createTextNode(typeof l === 'string' ? l : JSON.stringify(l)));
      div.appendChild(p);
    }
    document.body.appendChild(div);
  };
}
