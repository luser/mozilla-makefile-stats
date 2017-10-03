function get_etherpad_bug_data() {
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.onload = () => { console.log('Got etherpad data'); resolve(req.response); };
    req.onerror = (e) => reject(e);
    req.open('GET', 'https://public.etherpad-mozilla.org/p/makefile-conversion-bugs/export/txt', true);
    req.send(null);
  });
}

function object_values(o) {
  var vals = [];
  for (var key in o) {
    if (o.hasOwnProperty(key)) {
      vals.push(o[key]);
    }
  }
  return vals;
}

function load_bug_details(bug_data) {
  var bugs = new Set(object_values(bug_data).reduce((a, b) => a.concat(b), []));
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.onload = () => {
      console.log('Got bugzilla data');
      var info = req.response;
      function* make_bug_links(data) {
        for (var bug of data.bugs) {
          yield [bug.id, `<a title="${bug.status}${bug.resolution ? ' ' + bug.resolution : ''} - ${bug.summary}" style="${bug.resolution ? 'text-decoration: line-through;' : ''}" href="https://bugzilla.mozilla.org/show_bug.cgi?id=${bug.id}">${bug.id}</a>`];
        }
      }
      resolve({
        files: bug_data,
        bugs: new Map(make_bug_links(req.response))
      });
    };
    req.onerror = (e) => reject(e);
    req.open('GET', `https://bugzilla.mozilla.org/rest/bug?id=${Array.from(bugs).join(',')}&include_fields=id,summary,status,resolution`, true);
    req.setRequestHeader('Accept', 'text/json');
    req.send(null);
  });
}

function dom_loaded() {
  return new Promise((resolve, reject) => {
    function listener() {
      console.log('DOMContentLoaded');
      document.removeEventListener('DOMContentLoaded', listener);
      resolve();
    }
    document.addEventListener('DOMContentLoaded', listener, false);
  });
}

function fill_table_with_bugs(data) {
  console.log('filling table');
  var t = document.getElementsByTagName('table')[0].tBodies[0];
  var no_bug_files = 0;
  for (var row of t.rows) {
    var cells = row.cells;
    var f = cells[1].textContent;
    if (f in data.files) {
      cells[2].innerHTML = data.files[f].map((b) => data.bugs.get(b)).join(' ');
    } else {
      row.className = 'nobug';
      no_bug_files++;
    }
  }
  document.getElementById('no_bug_files').textContent = no_bug_files;
  document.getElementById('no_bug_percent').textContent = (100 * no_bug_files / t.rows.length).toFixed(2);
}

Promise.all([get_etherpad_bug_data().then(load_bug_details),
             dom_loaded(),
            ])
  .then((data) => fill_table_with_bugs(data[0]))
  .catch((e) => console.error(e));
