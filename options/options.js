/* global browser, document, console */
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);

function saveOptions(e) {
  e.preventDefault();
  var parameters = {};
  document.querySelectorAll('input[id]').forEach(function(item) {
    if (item.type === 'checkbox') {
      parameters[item.id] = item.checked;
    } else {
      parameters[item.id] = item.value;
    }
  });
  browser.storage.local.set(parameters);
}

function restoreOptions() {
  var value = '';
  var getting = '';

  var elements = Promise.all(
    [].slice.call(document.querySelectorAll('input[id]')).map(function(el) {
      var item = el.id;

      if (item.endsWith('priority')) {
        el.addEventListener('change', onChange);
      }

      getting = browser.storage.local.get(item);
      return getting.then(function(result) {
        value = result[Object.keys(result)[0]];
        var isInt = Number.isInteger(parseInt(value, 10));
        var isUrl = el.type === 'url';
        if (isInt || isUrl) {
          if(value !== undefined) {
            el.value = value;
	    el.setAttribute('value', value);
          }
        } else {
          el.checked = value;
        }
	return Promise.resolve(el);
      }, function(error) {
        console.log(`Error: ${error}`);
      });
    })
  );

  // Wait until all values were updated with browser storage information
  elements.then(function(elements) {
    var priorities = elements.filter(function (el) {
      return el.id.endsWith('priority');
    })
    onLoad(priorities);
  });
}

function onLoad(priorities) {
  var shareOptionRows = priorities.map(function(node) {
    // Move upwards until .row element
    return node.parentElement.parentElement.parentElement;
  });

  // Sort reverse according to its priority
  shareOptionRows = shareOptionRows.sort(function(a, b) {
    var aNode = a.querySelector('[id$="priority"]');
    var bNode = b.querySelector('[id$="priority"]');

    var aPriority = parseInt(aNode.value, 10);
    var bPriority = parseInt(bNode.value, 10);
    var order = bPriority - aPriority;

    if (order < 0) { return -1; }
    if (order > 0) { return  1; }
    return 0;
  })

  // Grab the first .row which is not related to priorities
  var endOfList = shareOptionRows[0].nextElementSibling;
  shareOptionRows.reduce(function(before, row) {
    var parentNode = row.parentElement;
    var refNode = before;
    parentNode.insertBefore(row, refNode);
    return row;
  }, endOfList);
}

function onChange(event) {
  updateDOM(getChange(event.target));
}

function getChange(changedShareOption) {
  var targetShareOption = changedShareOption.parentElement.parentElement.parentElement;
  var newPosition = parseInt(changedShareOption.value, 10);

  return {
    el: targetShareOption,
    to: newPosition
  };
}

function updateDOM(change) {
  move(change);
  updateState();
}

function move(change) {
  var refNode, nextSibling, row;

  var parentNode = change.el.parentElement;
  var rows = Array.from(parentNode.children);

  if (change.to <= 0) {
    // Do nothing. Alternatively, move to first position?
    return;
  } else if (change.to >= rows.length) {
    // Move to end, but keep in mind other form elements!
    var numberOfOptions = parentNode.querySelectorAll('[id$="priority"]').length;

    nextSibling = parentNode.querySelector([`[id$="priority"][value="${numberOfOptions}"]`]);
    row = nextSibling.parentElement.parentElement.parentElement; // Up to .row, i.e. same level as change.el
    refNode = row.nextElementSibling;
  } else {
    nextSibling = parentNode.querySelector([`[id$="priority"][value="${change.to}"]`]);
    row = nextSibling.parentElement.parentElement.parentElement; // Up to .row, i.e. same level as change.el

    var indexTargetOption  = rows.findIndex(function(el) { return el === row; });
    var indexChangedOption = rows.findIndex(function(el) { return el === change.el; });

    // indexTargetOption > indexChangedOption => downwards
    // indexTargetOption < indexChangedOption => upwards
    refNode = indexTargetOption > indexChangedOption ? row.nextElementSibling : row;
  }

  parentNode.insertBefore(change.el, refNode);
}

function updateState() {
  var allShareOptions = document.querySelectorAll('[id$="priority"]');
  allShareOptions.forEach(function(option, index) {
    var newValue = index + 1;  // Arrays start with 0
    option.setAttribute('value', newValue);
    option.value = newValue;
  });
}
