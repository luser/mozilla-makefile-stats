const TAG_DESC = {
  'rm': 'should be removed',
  'android': 'Android-specific',
  'windows': 'Windows-specific',
  'tup': 'Blocks tup backend for Linux',
  'l10n': 'Impacts l10n repacks',
  'tests': 'Test-only content',
  'gen_files': 'Can be replaced with GENERATED_FILES',
  'xpi': 'Creates XPI files',
};
function get_etherpad_data() {
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
  var bugs = new Set(object_values(bug_data).reduce((a, b) => a.concat(b), []).filter(x => Number.isInteger(x)));
  console.log(`bugs: ${Array.from(bugs).join(',')}`);
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

function fill_table_with_bugs_and_tags(data) {
  console.log('filling table');
  var t = document.getElementsByTagName('table')[0].tBodies[0];
  var no_bug_files = 0;
  for (var row of t.rows) {
    var cells = row.cells;
    var f = cells[1].textContent;
    var has_bugs = false;
    if (f in data.files) {
      var bugs = data.files[f].filter(x => Number.isInteger(x)).map((b) => data.bugs.get(b));
      var tags = data.files[f].filter(x => !Number.isInteger(x));
      if (bugs.length > 0) {
        has_bugs = true;
      }
      cells[2].innerHTML = bugs.join(' ');
      for (var tag of tags) {
        var title = TAG_DESC[tag] || '';
        cells[3].innerHTML += `<span title="${title}">${tag}</span> `;
      }
    }
    if (!has_bugs) {
      row.className = 'nobug';
      no_bug_files++;
    }
  }
  document.getElementById('no_bug_files').textContent = no_bug_files;
  document.getElementById('no_bug_percent').textContent = (100 * no_bug_files / t.rows.length).toFixed(2);
}

Promise.all([get_etherpad_data().then(load_bug_details),
             dom_loaded(),
            ])
  .then((data) => fill_table_with_bugs_and_tags(data[0]))
  .catch((e) => console.error(e));
